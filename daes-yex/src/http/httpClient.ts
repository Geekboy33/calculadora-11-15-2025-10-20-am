import type { HttpMethod, Logger, YexFailure, YexResult } from "../types.js";
import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}




import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}



import { isRetryableStatus, backoffDelay, sleep } from "./retry.js";

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  logger: Logger;
}

export class HttpClient {
  constructor(private opts: HttpClientOptions) {}

  async request<T>(
    url: string, 
    method: HttpMethod, 
    headers: Record<string, string>, 
    body?: any
  ): Promise<YexResult<T>> {
    const { timeoutMs, maxRetries, logger } = this.opts;

    const bodyString = body === undefined ? undefined : JSON.stringify(body);
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);

      try {
        logger.debug("HTTP request", { url, method, attempt });

        const res = await fetch(url, {
          method,
          headers: {
            ...(bodyString ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body: bodyString,
          signal: ac.signal,
        });

        clearTimeout(t);

        const text = await res.text();
        const status = res.status;

        logger.debug("HTTP response", { url, status, bodyLength: text.length });

        if (res.ok) {
          const data = (text ? JSON.parse(text) : undefined) as T;
          return { ok: true, data, status, headers: res.headers };
        }

        // attempt parse yex error json
        let yex: any = undefined;
        try { 
          yex = text ? JSON.parse(text) : undefined; 
        } catch {
          // No es JSON válido
        }

        const failure: YexFailure = {
          ok: false,
          status,
          headers: res.headers,
          error: new Error(`HTTP ${status}`),
          yex,
          bodyText: text,
        };

        if (attempt < maxRetries && isRetryableStatus(status)) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Retryable HTTP error; backing off", { 
            url, 
            method, 
            status, 
            attempt, 
            delayMs: d, 
            yex 
          });
          await sleep(d);
          continue;
        }

        return failure;
      } catch (err: any) {
        clearTimeout(t);
        lastErr = err;

        logger.debug("HTTP error", { url, method, attempt, error: String(err?.message || err) });

        if (attempt < maxRetries) {
          const d = backoffDelay(attempt, 250, 2500);
          logger.warn("Network/timeout error; backing off", { 
            url, 
            method, 
            attempt, 
            delayMs: d, 
            err: String(err?.message || err) 
          });
          await sleep(d);
          continue;
        }
      }
    }

    return {
      ok: false,
      status: 0,
      error: lastErr ?? new Error("Unknown error"),
    };
  }

  // Método conveniente para GET
  async get<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "GET", headers);
  }

  // Método conveniente para POST
  async post<T>(
    url: string, 
    body: any, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "POST", headers, body);
  }

  // Método conveniente para DELETE
  async delete<T>(
    url: string, 
    headers: Record<string, string> = {}
  ): Promise<YexResult<T>> {
    return this.request<T>(url, "DELETE", headers);
  }
}





