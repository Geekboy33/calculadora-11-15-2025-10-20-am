/**
 * dUSD Mint API Routes - In-Memory Version
 * 
 * ENDPOINT ÚNICO: POST /mint-request
 * Hace: hold → sign → mint en un solo request
 * 
 * ⚠️ SECURITY:
 * - beneficiary es SERVER-SIDE ONLY (DEFAULT_BENEFICIARY)
 * - La firma nunca se expone al frontend
 * - El usuario solo envía: amount_usd, wallet_destino
 */

import express from "express";
import { ethers } from "ethers";
import { httpProvider } from "../web3/provider.js";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi.js";
import { buildMintTypedData } from "../daes/eip712.js";
import { createHold, getHold, getAllHolds, captureHold, releaseHold, getStats } from "../daes/holdStore.js";
import { ipRateLimiter, walletRateLimiter } from "../middleware/rateLimiter.js";
import { 
  checkIdempotency, 
  markProcessing, 
  markCompleted, 
  markFailed,
  generateIdempotencyKey,
  getIdempotencyStats
} from "../middleware/idempotency.js";

const router = express.Router();

// Configuration from environment
const CHAIN_ID = Number(process.env.ARBITRUM_CHAIN_ID || 42161);
const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const signerPK = process.env.DAES_SIGNER_PRIVATE_KEY!;
const operatorPK = process.env.OPERATOR_PRIVATE_KEY!;

// ⚠️ CRITICAL: Server-side beneficiary - NEVER from frontend!
const DEFAULT_BENEFICIARY = process.env.DEFAULT_BENEFICIARY!;

// Wallets
const daesSigner = new ethers.Wallet(signerPK);
const operator = new ethers.Wallet(operatorPK, httpProvider);

// Bridge contract instance
const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, operator);

console.log(`[dUSD Routes] DAES Signer: ${daesSigner.address}`);
console.log(`[dUSD Routes] Operator: ${operator.address}`);
console.log(`[dUSD Routes] Bridge: ${BRIDGE}`);
console.log(`[dUSD Routes] Default Beneficiary: ${DEFAULT_BENEFICIARY}`);

// Helper: USD to dUSD units (6 decimals)
function usdToDusdUnits(amountUsd: number): bigint {
  return BigInt(Math.round(amountUsd * 1e6));
}

// =============================================================================
// ✅ ENDPOINT ÚNICO: mint-request (hold + sign + mint)
// =============================================================================
router.post("/mint-request", ipRateLimiter, async (req, res) => {
  const { amount_usd, wallet_destino, expiry_seconds, idempotency_key } = req.body;

  // === VALIDATION ===
  if (!ethers.isAddress(wallet_destino)) {
    return res.status(400).json({ success: false, error: "INVALID_WALLET_DESTINO" });
  }

  const amount = Number(amount_usd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: "INVALID_AMOUNT" });
  }

  if (amount < 1) {
    return res.status(400).json({ success: false, error: "AMOUNT_TOO_SMALL", min: 1 });
  }
  if (amount > 1000000) {
    return res.status(400).json({ success: false, error: "AMOUNT_TOO_LARGE", max: 1000000 });
  }

  // === RATE LIMIT POR WALLET ===
  const walletLimit = walletRateLimiter(wallet_destino, 5);
  if (!walletLimit.allowed) {
    return res.status(429).json({ 
      success: false, 
      error: "WALLET_RATE_LIMIT_EXCEEDED",
      message: "Too many mint requests for this wallet"
    });
  }

  // === IDEMPOTENCY CHECK ===
  const idemKey = idempotency_key || generateIdempotencyKey(wallet_destino, amount);
  
  const existingRequest = checkIdempotency(idemKey);
  if (existingRequest) {
    if (existingRequest.status === "processing") {
      return res.status(409).json({ 
        success: false, 
        error: "REQUEST_IN_PROGRESS"
      });
    }
    if (existingRequest.status === "completed" || existingRequest.status === "failed") {
      return res.json({
        ...existingRequest.result,
        idempotent: true
      });
    }
  }

  markProcessing(idemKey);

  const expiry = Number(expiry_seconds || 600);
  const daes_ref = `DAES-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const hold_id = `HOLD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  console.log(`[dUSD] New mint request: ${daes_ref}`);
  console.log(`[dUSD]   amount: $${amount} USD`);
  console.log(`[dUSD]   wallet_destino: ${wallet_destino}`);
  console.log(`[dUSD]   beneficiary: ${DEFAULT_BENEFICIARY} (server-side)`);

  try {
    // 1) CREATE HOLD
    createHold({
      daes_ref,
      hold_id,
      amount_usd: amount,
      currency: "USD",
      wallet_destino,
      beneficiary: DEFAULT_BENEFICIARY,
      expiry_seconds: expiry
    });
    console.log(`[dUSD] Hold created: ${daes_ref}`);

    // 2) BUILD AND SIGN EIP-712
    const deadline = BigInt(Math.floor(Date.now() / 1000) + expiry);
    
    // ✅ FIX: Nonce correcto - hash completo como BigInt
    const nonceHash = ethers.keccak256(ethers.toUtf8Bytes(`${daes_ref}:${hold_id}`));
    const nonce = BigInt(nonceHash);

    const typed = buildMintTypedData({
      bridgeMinter: BRIDGE,
      chainId: CHAIN_ID,
      daesRef: daes_ref,
      holdId: hold_id,
      amountUnits: usdToDusdUnits(amount),
      beneficiary: DEFAULT_BENEFICIARY,
      walletDestino: wallet_destino,
      deadline,
      nonce
    });

    const signature = await daesSigner.signTypedData(
      typed.domain, 
      typed.types as any, 
      typed.value as any
    );
    console.log(`[dUSD] Authorization signed by: ${daesSigner.address}`);

    // 3) MINT ON-CHAIN
    const authStruct = {
      daesRef: typed.value.daesRef,
      holdId: typed.value.holdId,
      amount: typed.value.amount,
      beneficiary: typed.value.beneficiary,
      walletDestino: typed.value.walletDestino,
      deadline: typed.value.deadline,
      nonce: typed.value.nonce
    };

    console.log(`[dUSD] Sending TX to BridgeMinter...`);
    const tx = await bridge.mintWithAuthorization(authStruct, signature);
    console.log(`[dUSD] TX sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[dUSD] TX confirmed: ${receipt.hash}`);

    // 4) CAPTURE HOLD
    captureHold(daes_ref, receipt.hash);

    const successResult = {
      success: true,
      daes_ref,
      hold_id,
      tx_hash: receipt.hash,
      status: "CAPTURED",
      amount_usd: amount,
      amount_dusd: amount,
      wallet_destino,
      minted_to: DEFAULT_BENEFICIARY,
      message: "dUSD minted successfully"
    };

    markCompleted(idemKey, successResult);
    res.json(successResult);

  } catch (e: any) {
    console.error(`[dUSD] Error in mint-request:`, e);
    
    try { releaseHold(daes_ref, "0x0"); } catch {}

    const errorResult = { 
      success: false, 
      daes_ref, 
      error: e?.reason || e?.message || "MINT_FAILED",
      code: e?.code
    };

    markFailed(idemKey, errorResult.error);
    res.status(500).json(errorResult);
  }
});

// =============================================================================
// GET /hold/:daes_ref
// =============================================================================
router.get("/hold/:daes_ref", (req, res) => {
  const hold = getHold(req.params.daes_ref);
  if (!hold) {
    return res.status(404).json({ success: false, error: "NOT_FOUND" });
  }
  res.json({ success: true, hold });
});

// =============================================================================
// GET /holds
// =============================================================================
router.get("/holds", (req, res) => {
  const holds = getAllHolds();
  res.json({ success: true, holds, count: holds.length });
});

// =============================================================================
// GET /stats
// =============================================================================
router.get("/stats", (req, res) => {
  const stats = getStats();
  const idempotencyStats = getIdempotencyStats();
  res.json({ success: true, ...stats, idempotency: idempotencyStats });
});

// =============================================================================
// GET /health
// =============================================================================
router.get("/health", async (req, res) => {
  try {
    const blockNumber = await httpProvider.getBlockNumber();
    res.json({ 
      success: true, 
      status: "healthy",
      blockNumber,
      chainId: CHAIN_ID,
      bridge: BRIDGE,
      signer: daesSigner.address,
      operator: operator.address,
      beneficiary: DEFAULT_BENEFICIARY,
      storage: "in-memory"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
