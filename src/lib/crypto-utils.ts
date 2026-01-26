// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO UTILS - Cryptographic utilities for Treasury Minting Platform
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a random ID
 */
export function generateRandomId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Generate an authorization code
 */
export function generateAuthorizationCode(): string {
  const prefix = 'AUTH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomId(6);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a publication code for Mint Explorer
 */
export function generatePublicationCode(): string {
  const prefix = 'PUB';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomId(8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a lock ID
 */
export function generateLockId(): string {
  const prefix = 'LOCK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomId(6);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a mint request ID
 */
export function generateMintRequestId(): string {
  const prefix = 'MINT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomId(6);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * SHA256 hash function
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous SHA256 using a simple implementation (for non-async contexts)
 */
export function sha256Sync(message: string): string {
  // Simple hash for non-critical uses - in production use proper crypto
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to hex-like string
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(8); // Return 64 char string
}

/**
 * Generate HMAC signature
 */
export async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expectedSignature = await generateHMAC(message, secret);
    return expectedSignature === signature;
  } catch (error) {
    console.error('[verifyHMAC] Error:', error);
    return false;
  }
}

/**
 * Generate a secure random hex string
 */
export function generateSecureHex(bytes: number = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a transaction hash (mock for testing)
 */
export function generateTxHash(): string {
  return '0x' + generateSecureHex(32);
}

/**
 * Generate a wallet address (mock for testing)
 */
export function generateAddress(): string {
  return '0x' + generateSecureHex(20);
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, start: number = 10, end: number = 8): string {
  if (!hash || hash.length < start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export default {
  generateRandomId,
  generateAuthorizationCode,
  generatePublicationCode,
  generateLockId,
  generateMintRequestId,
  sha256,
  sha256Sync,
  generateHMAC,
  verifyHMAC,
  generateSecureHex,
  generateTxHash,
  generateAddress,
  isValidAddress,
  isValidTxHash,
  formatAddress,
  formatTxHash
};
