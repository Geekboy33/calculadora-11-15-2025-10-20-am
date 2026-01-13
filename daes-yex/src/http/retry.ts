export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};




  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};



  maxRetries: number;
  baseDelayMs: number; // e.g. 250
  maxDelayMs: number;  // e.g. 2500
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function backoffDelay(attempt: number, base: number, max: number): number {
  // exponential backoff + jitter
  const exp = Math.min(max, base * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(200, exp));
  return Math.min(max, exp + jitter);
}

export function isRetryableStatus(status: number): boolean {
  // 429 = Too Many Requests
  // 418 = IP ban (Binance-style)
  // 5xx = Server errors
  return status === 429 || status === 418 || (status >= 500 && status <= 599);
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("abort")
  );
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 2500,
};





