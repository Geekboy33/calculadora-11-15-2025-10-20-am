/**
 * ISO 4217 Currency Code Utilities
 * Converts currency codes to bytes3 for on-chain storage
 */

import { ethers } from "ethers";

// ISO 4217 currency codes to bytes3 mapping
const ISO4217_CODES: Record<string, string> = {
  "USD": "0x555344", // U=0x55, S=0x53, D=0x44
  "EUR": "0x455552", // E=0x45, U=0x55, R=0x52
  "GBP": "0x474250", // G=0x47, B=0x42, P=0x50
  "JPY": "0x4a5059", // J=0x4a, P=0x50, Y=0x59
  "CHF": "0x434846", // C=0x43, H=0x48, F=0x46
};

/**
 * Convert ISO 4217 currency code to bytes3
 * @param code Currency code (e.g., "USD")
 * @returns bytes3 hex string (e.g., "0x555344")
 */
export function currencyToBytes3(code: string): string {
  const upperCode = code.toUpperCase();
  
  // Check if we have a pre-defined mapping
  if (ISO4217_CODES[upperCode]) {
    return ISO4217_CODES[upperCode];
  }

  // Convert dynamically for any 3-letter code
  if (code.length !== 3) {
    throw new Error(`Invalid ISO 4217 code: ${code} (must be 3 characters)`);
  }

  const bytes = ethers.toUtf8Bytes(upperCode);
  if (bytes.length !== 3) {
    throw new Error(`Invalid ISO 4217 code: ${code}`);
  }

  return ethers.hexlify(bytes);
}

/**
 * Convert bytes3 hex string to ISO 4217 currency code
 * @param bytes3Hex bytes3 hex string (e.g., "0x555344")
 * @returns Currency code (e.g., "USD")
 */
export function bytes3ToCurrency(bytes3Hex: string): string {
  const bytes = ethers.getBytes(bytes3Hex);
  if (bytes.length !== 3) {
    throw new Error(`Invalid bytes3: ${bytes3Hex}`);
  }
  return ethers.toUtf8String(bytes);
}

/**
 * Get USD as bytes3
 */
export function getUsdBytes3(): string {
  return ISO4217_CODES["USD"];
}

export default {
  currencyToBytes3,
  bytes3ToCurrency,
  getUsdBytes3,
  ISO4217_CODES
};

