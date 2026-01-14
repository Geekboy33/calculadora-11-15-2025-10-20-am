export type LogLevel = "debug" | "info" | "warn" | "error";

export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}





export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}




export interface YexConfig {
  apiKey: string;
  apiSecret: string;

  restBase: string;      // https://openapi.yex.io
  futuresBase: string;   // https://futuresopenapi.yex.io
  wsUrl?: string;        // wss://.../kline-api/ws

  recvWindowMs: number;  // default 5000
  timeoutMs: number;     // default 15000
  maxRetries: number;    // default 3
  logLevel: LogLevel;    // default info
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number env var: ${name}`);
  return n;
}

export function loadYexConfig(): YexConfig {
  return {
    apiKey: must("YEX_API_KEY"),
    apiSecret: must("YEX_API_SECRET"),
    restBase: process.env.YEX_REST_BASE || "https://openapi.yex.io",
    futuresBase: process.env.YEX_FUTURES_BASE || "https://futuresopenapi.yex.io",
    wsUrl: process.env.YEX_WS_URL,

    recvWindowMs: num("YEX_RECV_WINDOW_MS", 5000),
    timeoutMs: num("YEX_TIMEOUT_MS", 15000),
    maxRetries: num("YEX_MAX_RETRIES", 3),
    logLevel: (process.env.YEX_LOG_LEVEL as LogLevel) || "info",
  };
}






