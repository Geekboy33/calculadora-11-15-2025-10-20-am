/**
 * ISO 20022 Receipt Types
 * Simplified structure for DAES settlement receipts
 */

export interface IsoReceiptParty {
  name: string;
  identifier: string;
  identifierType: "WALLET" | "IBAN" | "ACCOUNT";
}

export interface IsoReceiptAmount {
  value: number;
  currency: string; // ISO 4217 (e.g., "USD")
  decimals: number;
}

export interface IsoReceipt {
  // Header
  messageId: string;
  creationDateTime: string; // ISO 8601
  
  // Transaction
  transactionId: string;
  instructionId: string;
  endToEndId: string;
  
  // Parties
  debtor: IsoReceiptParty;
  creditor: IsoReceiptParty;
  
  // Amount
  instructedAmount: IsoReceiptAmount;
  
  // Settlement
  settlementMethod: "BLOCKCHAIN";
  settlementChain: string; // e.g., "ETHEREUM"
  settlementChainId: number;
  
  // References
  holdId: string;
  txHash?: string;
  blockNumber?: number;
  
  // Status
  status: "PENDING" | "SETTLED" | "FAILED";
  
  // Signature
  signature?: string;
  signedBy?: string;
  signedAt?: string;
}

export interface CanonicalReceipt {
  raw: string;
  hash: string; // SHA256 of canonical
  keccak: string; // keccak256 for on-chain
}

