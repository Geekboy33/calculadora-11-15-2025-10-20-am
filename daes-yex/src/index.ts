/**
 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;




 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;



 * DAES YEX SDK
 * 
 * Complete TypeScript SDK for YEX Exchange API
 * Supports: Spot, Margin, Futures, Withdraw, WebSocket
 * 
 * @example
 * ```typescript
 * import { createYexSdk } from "daes-yex";
 * 
 * const yex = createYexSdk();
 * 
 * // Get ticker
 * const ticker = await yex.spot.ticker("BTCUSDT");
 * 
 * // Place order
 * const order = await yex.spot.newOrder({
 *   symbol: "BTCUSDT",
 *   side: "BUY",
 *   type: "LIMIT",
 *   quantity: "0.001",
 *   price: "30000",
 *   newClientOrderId: "DAES-ORDER-001"
 * });
 * 
 * // WebSocket
 * yex.ws?.onMessage((msg) => console.log(msg));
 * yex.ws?.connect();
 * yex.ws?.subscribe("market_BTCUSDT_ticker");
 * ```
 */

import { loadYexConfig, type YexConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { YexRestClient } from "./yex/yexRestClient.js";
import { YexSpot } from "./yex/spot.js";
import { YexMargin } from "./yex/margin.js";
import { YexWithdraw } from "./yex/withdraw.js";
import { YexFutures } from "./yex/futures.js";
import { YexWsClient } from "./yex/yexWsClient.js";
import type { Logger } from "./types.js";

// Re-export types
export * from "./types.js";
export * from "./errors.js";
export * from "./config.js";

// Re-export clients
export { YexRestClient } from "./yex/yexRestClient.js";
export { YexSpot } from "./yex/spot.js";
export { YexMargin } from "./yex/margin.js";
export { YexWithdraw } from "./yex/withdraw.js";
export { YexFutures } from "./yex/futures.js";
export { YexWsClient } from "./yex/yexWsClient.js";
export { YexSigner } from "./yex/yexSigner.js";

// Re-export utilities
export { createLogger, consoleLogger, nullLogger } from "./utils/logger.js";
export { hmacSha256Hex, sha256Hex, randomBytes, generateNonce } from "./utils/crypto.js";
export { nowMs, nowSeconds, formatTimestamp } from "./utils/time.js";
export { toQuery, toQueryString, parseQuery } from "./utils/qs.js";
export { gunzipToString, gzipFromString, isGzipped, tryGunzip } from "./utils/gzip.js";

// Re-export HTTP utilities
export { HttpClient } from "./http/httpClient.js";
export { MinuteRateLimiter, SecondRateLimiter } from "./http/rateLimiter.js";
export { sleep, backoffDelay, isRetryableStatus, isNetworkError, defaultRetryOptions } from "./http/retry.js";

/**
 * YEX SDK Instance
 */
export interface YexSdk {
  /** Configuration */
  cfg: YexConfig;
  /** Logger instance */
  logger: Logger;
  /** REST client (low-level) */
  rest: YexRestClient;
  /** Spot trading */
  spot: YexSpot;
  /** Margin trading */
  margin: YexMargin;
  /** Withdraw/Deposit */
  withdraw: YexWithdraw;
  /** Futures trading */
  futures: YexFutures;
  /** WebSocket client (undefined if WS URL not configured) */
  ws?: YexWsClient;
}

/**
 * Options for creating YEX SDK
 */
export interface CreateYexSdkOptions {
  /** Override config from env vars */
  config?: Partial<YexConfig>;
  /** Custom logger */
  logger?: Logger;
  /** Local rate limit per minute (default: 1200) */
  localReqPerMinute?: number;
}

/**
 * Create YEX SDK instance
 * 
 * Loads configuration from environment variables:
 * - YEX_API_KEY (required)
 * - YEX_API_SECRET (required)
 * - YEX_REST_BASE (default: https://openapi.yex.io)
 * - YEX_FUTURES_BASE (default: https://futuresopenapi.yex.io)
 * - YEX_WS_URL (optional)
 * - YEX_RECV_WINDOW_MS (default: 5000)
 * - YEX_TIMEOUT_MS (default: 15000)
 * - YEX_MAX_RETRIES (default: 3)
 * - YEX_LOG_LEVEL (default: info)
 * 
 * @param options Optional configuration overrides
 * @returns YEX SDK instance
 */
export function createYexSdk(options?: CreateYexSdkOptions): YexSdk {
  // Load config from env, with optional overrides
  const envConfig = loadYexConfig();
  const cfg: YexConfig = {
    ...envConfig,
    ...options?.config,
  };

  // Create logger
  const logger = options?.logger ?? createLogger(cfg.logLevel);

  // Create REST client
  const rest = new YexRestClient({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    restBase: cfg.restBase,
    futuresBase: cfg.futuresBase,
    recvWindowMs: cfg.recvWindowMs,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
    localReqPerMinute: options?.localReqPerMinute ?? 1200, // conservador
    logger,
  });

  // Create module clients
  const spot = new YexSpot(rest);
  const margin = new YexMargin(rest);
  const withdraw = new YexWithdraw(rest);
  const futures = new YexFutures(rest);

  // Create WebSocket client if URL configured
  const ws = cfg.wsUrl
    ? new YexWsClient({
        url: cfg.wsUrl,
        logger,
        autoReconnect: true,
        reconnectDelayMs: 1500,
        pingIntervalMs: 30000,
      })
    : undefined;

  return { cfg, logger, rest, spot, margin, withdraw, futures, ws };
}

/**
 * Create YEX SDK with explicit config (no env vars)
 * 
 * @param apiKey API Key
 * @param apiSecret API Secret
 * @param options Additional options
 * @returns YEX SDK instance
 */
export function createYexSdkWithKeys(
  apiKey: string,
  apiSecret: string,
  options?: Omit<CreateYexSdkOptions, "config"> & {
    restBase?: string;
    futuresBase?: string;
    wsUrl?: string;
  }
): YexSdk {
  return createYexSdk({
    ...options,
    config: {
      apiKey,
      apiSecret,
      restBase: options?.restBase ?? "https://openapi.yex.io",
      futuresBase: options?.futuresBase ?? "https://futuresopenapi.yex.io",
      wsUrl: options?.wsUrl,
      recvWindowMs: 5000,
      timeoutMs: 15000,
      maxRetries: 3,
      logLevel: "info",
    },
  });
}

// Default export
export default createYexSdk;






