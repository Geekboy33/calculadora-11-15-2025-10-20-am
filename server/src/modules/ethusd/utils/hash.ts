/**
 * Hash Utilities
 * For creating deterministic hashes used in the system
 */

import { ethers } from "ethers";
import * as crypto from "crypto";

/**
 * Create a keccak256 hash of a string
 */
export function keccak256(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Create a keccak256 hash of bytes
 */
export function keccak256Bytes(data: Uint8Array): string {
  return ethers.keccak256(data);
}

/**
 * Create a SHA256 hash (for ISO20022 compatibility)
 */
export function sha256(data: string): string {
  return "0x" + crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Create a deterministic holdId from reference strings
 */
export function createHoldId(daesRef: string, externalRef?: string): string {
  const input = externalRef 
    ? `${daesRef}:${externalRef}` 
    : daesRef;
  return keccak256(input);
}

/**
 * Create a bytes32 from a string (padded if needed)
 */
export function stringToBytes32(str: string): string {
  if (str.startsWith("0x") && str.length === 66) {
    return str; // Already bytes32
  }
  return ethers.encodeBytes32String(str.slice(0, 31)); // Max 31 chars
}

/**
 * Decode bytes32 to string
 */
export function bytes32ToString(bytes32: string): string {
  try {
    return ethers.decodeBytes32String(bytes32);
  } catch {
    return bytes32;
  }
}

export default {
  keccak256,
  keccak256Bytes,
  sha256,
  createHoldId,
  stringToBytes32,
  bytes32ToString
};

