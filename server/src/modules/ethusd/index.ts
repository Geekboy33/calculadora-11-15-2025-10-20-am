/**
 * ETH USD Module
 * DAES USD tokenization on Ethereum Mainnet
 */

// Config
export { ETH_USD_CONFIG, validateEthUsdConfig } from "./ethusd.config.js";

// Provider
export {
  getHttpProvider,
  getWsProvider,
  getDaesSigner,
  getOperator,
  checkConnection
} from "./ethusd.provider.js";

// Utils
export { currencyToBytes3, bytes3ToCurrency, getUsdBytes3 } from "./utils/iso4217.js";
export { keccak256, sha256, createHoldId, stringToBytes32 } from "./utils/hash.js";

// ISO20022
export {
  buildReceipt,
  canonicalizeReceipt,
  signReceipt,
  verifyReceiptSignature,
  getIso20022Hash
} from "./iso/isoReceipt.service.js";
export type { IsoReceipt, CanonicalReceipt } from "./iso/isoReceipt.types.js";

// Price
export { getPriceSnapshot, calculateMedian, validatePrice } from "./price/price.service.js";
export type { PriceSnapshot, PriceSource } from "./price/price.types.js";

// Mint
export {
  buildMintTypedData,
  signMintAuthorization,
  recoverMintSigner,
  getMintDomain,
  MINT_AUTHORIZATION_TYPES
} from "./mint/mint.eip712.js";
export type { MintAuthorizationStruct } from "./mint/mint.eip712.js";

export {
  executeMint,
  getHold,
  getAllHolds,
  getStats
} from "./mint/mint.service.js";
export type { MintRequest, MintResult } from "./mint/mint.service.js";

// Routes
export { default as ethUsdMintRouter } from "./mint/mint.routes.js";
export { default as ethUsdScanRouter } from "./scan/scan.routes.js";

// Scanner
export {
  startScanner,
  stopScanner,
  getIndexedTransaction,
  getWalletActivity,
  getScannerStats
} from "./scan/scan.service.js";

console.log("[ETH USD Module] Loaded ✅");

