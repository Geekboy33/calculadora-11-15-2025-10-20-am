/**
 * EIP-712 Typed Data for ETH USD Mint Authorization
 * VERSION 2 - BridgeMinterV2 with PriceSnapshot fields
 * Must match BridgeMinterV2.sol exactly
 */

import { ethers } from "ethers";
import { ETH_USD_CONFIG } from "../ethusd.config.js";

/**
 * EIP-712 Domain for DAES USD BridgeMinterV2
 * VERSION 2 - Updated domain
 */
export function getMintDomain() {
  return {
    name: "DAES USD BridgeMinter",
    version: "2", // <-- VERSION 2
    chainId: ETH_USD_CONFIG.chainId,
    verifyingContract: ETH_USD_CONFIG.bridgeMinter
  };
}

/**
 * EIP-712 Types for MintAuthorization V2
 * Includes price fields for PriceSnapshot event
 */
export const MINT_AUTHORIZATION_TYPES = {
  MintAuthorization: [
    { name: "holdId", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "beneficiary", type: "address" },
    { name: "iso20022Hash", type: "bytes32" },
    { name: "iso4217", type: "bytes3" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "uint256" },
    // NEW V2 FIELDS - Price Snapshot
    { name: "ethUsdPrice", type: "int256" },
    { name: "priceDecimals", type: "uint8" },
    { name: "priceTs", type: "uint64" }
  ]
};

/**
 * MintAuthorization struct V2
 * Includes price fields for on-chain PriceSnapshot
 */
export interface MintAuthorizationStruct {
  holdId: string; // bytes32
  amount: bigint;
  beneficiary: string; // address
  iso20022Hash: string; // bytes32
  iso4217: string; // bytes3
  deadline: bigint;
  nonce: bigint;
  // NEW V2 FIELDS
  ethUsdPrice: bigint; // int256 - price with 8 decimals
  priceDecimals: number; // uint8 - always 8
  priceTs: bigint; // uint64 - unix timestamp seconds
}

/**
 * Build typed data for signing V2
 */
export function buildMintTypedData(params: {
  holdId: string;
  amount: bigint;
  beneficiary: string;
  iso20022Hash: string;
  iso4217Bytes: string;
  deadline: bigint;
  nonce: bigint;
  // NEW V2 FIELDS
  ethUsdPrice: bigint;
  priceDecimals: number;
  priceTs: bigint;
}): {
  domain: ReturnType<typeof getMintDomain>;
  types: typeof MINT_AUTHORIZATION_TYPES;
  value: MintAuthorizationStruct;
} {
  const domain = getMintDomain();

  const value: MintAuthorizationStruct = {
    holdId: params.holdId,
    amount: params.amount,
    beneficiary: params.beneficiary,
    iso20022Hash: params.iso20022Hash,
    iso4217: params.iso4217Bytes,
    deadline: params.deadline,
    nonce: params.nonce,
    // NEW V2 FIELDS
    ethUsdPrice: params.ethUsdPrice,
    priceDecimals: params.priceDecimals,
    priceTs: params.priceTs
  };

  return {
    domain,
    types: MINT_AUTHORIZATION_TYPES,
    value
  };
}

/**
 * Sign MintAuthorization V2 with DAES signer
 * Includes price fields in the signature
 */
export async function signMintAuthorization(
  signer: ethers.Wallet,
  params: {
    holdId: string;
    amount: bigint;
    beneficiary: string;
    iso20022Hash: string;
    iso4217Bytes: string;
    deadline: bigint;
    nonce: bigint;
    // NEW V2 FIELDS
    ethUsdPrice: bigint;
    priceDecimals: number;
    priceTs: bigint;
  }
): Promise<string> {
  const { domain, types, value } = buildMintTypedData(params);

  console.log("[EIP-712 V2] Signing MintAuthorization with price snapshot:");
  console.log(`  holdId: ${params.holdId}`);
  console.log(`  amount: ${params.amount.toString()}`);
  console.log(`  beneficiary: ${params.beneficiary}`);
  console.log(`  ethUsdPrice: ${params.ethUsdPrice.toString()} (${Number(params.ethUsdPrice) / 1e8} USD)`);
  console.log(`  priceDecimals: ${params.priceDecimals}`);
  console.log(`  priceTs: ${params.priceTs.toString()}`);

  const signature = await signer.signTypedData(
    domain,
    types as any,
    value as any
  );

  console.log(`[EIP-712 V2] Signature created by: ${signer.address}`);

  return signature;
}

/**
 * Recover signer from signature V2
 */
export function recoverMintSigner(
  params: {
    holdId: string;
    amount: bigint;
    beneficiary: string;
    iso20022Hash: string;
    iso4217Bytes: string;
    deadline: bigint;
    nonce: bigint;
    ethUsdPrice: bigint;
    priceDecimals: number;
    priceTs: bigint;
  },
  signature: string
): string {
  const { domain, types, value } = buildMintTypedData(params);

  return ethers.verifyTypedData(
    domain,
    types as any,
    value as any,
    signature
  );
}

/**
 * Calculate price in int256 format with 8 decimals
 * @param price - Price in USD (e.g., 2500.00)
 * @returns BigInt scaled to 8 decimals (e.g., 250000000000n)
 */
export function scalePriceToInt256(price: number): bigint {
  // Scale to 8 decimals: 2500.00 -> 250000000000
  return BigInt(Math.round(price * 1e8));
}

/**
 * Get current price timestamp in seconds
 */
export function getCurrentPriceTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export default {
  getMintDomain,
  MINT_AUTHORIZATION_TYPES,
  buildMintTypedData,
  signMintAuthorization,
  recoverMintSigner,
  scalePriceToInt256,
  getCurrentPriceTimestamp
};
