/**
 * ISO 20022 Receipt Service
 * Creates and signs settlement receipts
 */

import { ethers } from "ethers";
import { IsoReceipt, IsoReceiptAmount, IsoReceiptParty, CanonicalReceipt } from "./isoReceipt.types.js";
import { sha256, keccak256 } from "../utils/hash.js";
import { getDaesSigner } from "../ethusd.provider.js";
import { ETH_USD_CONFIG } from "../ethusd.config.js";

/**
 * Build an ISO 20022 receipt
 */
export function buildReceipt(params: {
  daesRef: string;
  holdId: string;
  amount: number;
  currency?: string;
  debtorName: string;
  debtorId: string;
  creditorName: string;
  creditorId: string;
  txHash?: string;
  blockNumber?: number;
}): IsoReceipt {
  const now = new Date().toISOString();
  const messageId = `DAES-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const debtor: IsoReceiptParty = {
    name: params.debtorName,
    identifier: params.debtorId,
    identifierType: params.debtorId.startsWith("0x") ? "WALLET" : "ACCOUNT"
  };

  const creditor: IsoReceiptParty = {
    name: params.creditorName,
    identifier: params.creditorId,
    identifierType: params.creditorId.startsWith("0x") ? "WALLET" : "ACCOUNT"
  };

  const amount: IsoReceiptAmount = {
    value: params.amount,
    currency: params.currency || "USD",
    decimals: 6
  };

  return {
    messageId,
    creationDateTime: now,
    transactionId: params.daesRef,
    instructionId: params.holdId.slice(0, 35),
    endToEndId: params.holdId,
    debtor,
    creditor,
    instructedAmount: amount,
    settlementMethod: "BLOCKCHAIN",
    settlementChain: "ETHEREUM",
    settlementChainId: ETH_USD_CONFIG.chainId,
    holdId: params.holdId,
    txHash: params.txHash,
    blockNumber: params.blockNumber,
    status: params.txHash ? "SETTLED" : "PENDING"
  };
}

/**
 * Canonicalize a receipt (deterministic JSON)
 */
export function canonicalizeReceipt(receipt: IsoReceipt): CanonicalReceipt {
  // Sort keys and create deterministic JSON
  const sortedReceipt = sortObjectKeys(receipt);
  const raw = JSON.stringify(sortedReceipt);
  
  return {
    raw,
    hash: sha256(raw),
    keccak: keccak256(raw)
  };
}

/**
 * Sort object keys recursively for deterministic serialization
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sorted: any = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  
  return sorted;
}

/**
 * Sign a receipt with DAES signer
 */
export async function signReceipt(receipt: IsoReceipt): Promise<IsoReceipt> {
  const signer = getDaesSigner();
  const canonical = canonicalizeReceipt(receipt);
  
  // Sign the SHA256 hash of the canonical receipt
  const digestBytes = ethers.getBytes(canonical.hash);
  const signature = await signer.signMessage(digestBytes);
  
  return {
    ...receipt,
    signature,
    signedBy: signer.address,
    signedAt: new Date().toISOString()
  };
}

/**
 * Verify a receipt signature
 */
export function verifyReceiptSignature(receipt: IsoReceipt): {
  valid: boolean;
  recoveredAddress?: string;
  error?: string;
} {
  if (!receipt.signature) {
    return { valid: false, error: "No signature" };
  }

  try {
    const canonical = canonicalizeReceipt(receipt);
    const digestBytes = ethers.getBytes(canonical.hash);
    const recoveredAddress = ethers.verifyMessage(digestBytes, receipt.signature);
    
    const valid = receipt.signedBy 
      ? recoveredAddress.toLowerCase() === receipt.signedBy.toLowerCase()
      : true;
    
    return { valid, recoveredAddress };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get ISO20022 hash for on-chain storage (keccak256)
 */
export function getIso20022Hash(receipt: IsoReceipt): string {
  const canonical = canonicalizeReceipt(receipt);
  return canonical.keccak;
}

export default {
  buildReceipt,
  canonicalizeReceipt,
  signReceipt,
  verifyReceiptSignature,
  getIso20022Hash
};

