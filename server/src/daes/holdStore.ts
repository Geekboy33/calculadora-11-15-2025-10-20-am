/**
 * Hold Store - In-Memory Version
 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}

 * Para desarrollo/staging sin Redis
 */

export type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

export interface HoldRecord {
  daes_ref: string;
  hold_id: string;
  amount_usd: number;
  currency: "USD";
  wallet_destino: string;
  beneficiary: string;
  expiry_seconds: number;
  created_at: number;
  status: HoldStatus;
  tx_hash?: string;
}

const holds = new Map<string, HoldRecord>(); // key = daes_ref

export function createHold(input: Omit<HoldRecord, "created_at" | "status">): HoldRecord {
  const rec: HoldRecord = { ...input, created_at: Date.now(), status: "HOLD_CONFIRMED" };
  holds.set(rec.daes_ref, rec);
  return rec;
}

export function getHold(daes_ref: string) {
  return holds.get(daes_ref);
}

export function getAllHolds() {
  return Array.from(holds.values());
}

export function captureHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "CAPTURED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function releaseHold(daes_ref: string, tx_hash: string) {
  const rec = holds.get(daes_ref);
  if (!rec) throw new Error("HOLD_NOT_FOUND");
  rec.status = "RELEASED";
  rec.tx_hash = tx_hash;
  return rec;
}

export function getStats() {
  const all = Array.from(holds.values());
  return {
    total: all.length,
    captured: all.filter(h => h.status === "CAPTURED").length,
    released: all.filter(h => h.status === "RELEASED").length,
    pending: all.filter(h => h.status === "HOLD_CONFIRMED").length,
    total_amount_captured: all.filter(h => h.status === "CAPTURED").reduce((s, h) => s + h.amount_usd, 0),
    total_amount_pending: all.filter(h => h.status === "HOLD_CONFIRMED").reduce((s, h) => s + h.amount_usd, 0)
  };
}
