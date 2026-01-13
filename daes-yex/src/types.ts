export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}




export type SecurityType =
  | "NONE"
  | "TRADE"
  | "USER_DATA"
  | "USER_STREAM"
  | "MARKET_DATA";

export interface YexErrorPayload {
  code: number;
  msg: string;
}

export interface YexResponse<T> {
  ok: true;
  data: T;
  status: number;
  headers: Headers;
}

export interface YexFailure {
  ok: false;
  status: number;
  headers?: Headers;
  error: Error;
  yex?: YexErrorPayload;
  bodyText?: string;
}

export type YexResult<T> = YexResponse<T> | YexFailure;

export type SymbolName = string; // e.g. BTCUSDT

export interface Logger {
  debug(msg: string, meta?: any): void;
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}





