/**
 * Idempotency Middleware - In-Memory Version
 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);

 * Para desarrollo/staging sin Redis
 */

interface IdempotencyRecord {
  createdAt: number;
  status: "processing" | "completed" | "failed";
  result?: any;
}

const store = new Map<string, IdempotencyRecord>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export function checkIdempotency(key: string): IdempotencyRecord | null {
  if (!key) return null;
  const rec = store.get(key);
  if (!rec) return null;
  if (Date.now() - rec.createdAt > TTL) {
    store.delete(key);
    return null;
  }
  return rec;
}

export function markProcessing(key: string) {
  store.set(key, { createdAt: Date.now(), status: "processing" });
}

export function markCompleted(key: string, result: any) {
  store.set(key, { createdAt: Date.now(), status: "completed", result });
}

export function markFailed(key: string, error: any) {
  store.set(key, { createdAt: Date.now(), status: "failed", result: { success: false, error } });
}

export function generateIdempotencyKey(wallet: string, amount: number): string {
  const ts = Math.floor(Date.now() / 60000);
  return `mint_${wallet.toLowerCase()}_${amount}_${ts}`;
}

export function getIdempotencyStats() {
  const values = Array.from(store.values());
  return {
    total: store.size,
    processing: values.filter(v => v.status === "processing").length,
    completed: values.filter(v => v.status === "completed").length,
    failed: values.filter(v => v.status === "failed").length
  };
}

// Cleanup expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL) store.delete(k);
  }
}, 60 * 60 * 1000);
