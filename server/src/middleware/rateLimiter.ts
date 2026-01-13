/**
 * Rate Limiter Middleware - In-Memory Version
 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);

 */

import rateLimit from "express-rate-limit";

export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests, try again in 1 minute" }
});

const walletCounts = new Map<string, { count: number; reset: number }>();

export function walletRateLimiter(wallet: string, maxPerMinute = 5) {
  const key = wallet.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 1000;

  const cur = walletCounts.get(key);
  if (!cur || now > cur.reset) {
    walletCounts.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }
  if (cur.count >= maxPerMinute) return { allowed: false, remaining: 0 };
  cur.count++;
  return { allowed: true, remaining: maxPerMinute - cur.count };
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of walletCounts.entries()) {
    if (now > v.reset) walletCounts.delete(k);
  }
}, 60 * 1000);
