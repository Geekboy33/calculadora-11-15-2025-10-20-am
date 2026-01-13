/**
 * ETH USD Scanner Routes
 * API endpoints for querying indexed data
 */

import express from "express";
import { ethers } from "ethers";
import {
  getIndexedTransaction,
  getWalletActivity,
  getScannerStats,
  startScanner,
  stopScanner
} from "./scan.service.js";

const router = express.Router();

/**
 * GET /tx/:txHash
 * Get indexed transaction by hash
 */
router.get("/tx/:txHash", (req, res) => {
  const { txHash } = req.params;

  if (!txHash || txHash.length !== 66) {
    return res.status(400).json({ success: false, error: "INVALID_TX_HASH" });
  }

  const tx = getIndexedTransaction(txHash);
  if (!tx) {
    return res.status(404).json({ success: false, error: "TX_NOT_FOUND" });
  }

  res.json({
    success: true,
    transaction: tx,
    explorerUrl: `https://etherscan.io/tx/${txHash}`
  });
});

/**
 * GET /wallet/:address
 * Get wallet activity
 */
router.get("/wallet/:address", (req, res) => {
  const { address } = req.params;

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ success: false, error: "INVALID_ADDRESS" });
  }

  const activity = getWalletActivity(address);
  if (!activity) {
    return res.status(404).json({ 
      success: false, 
      error: "NO_ACTIVITY_FOUND",
      address 
    });
  }

  res.json({
    success: true,
    ...activity,
    explorerUrl: `https://etherscan.io/address/${address}`
  });
});

/**
 * GET /stats
 * Get scanner statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await getScannerStats();
    res.json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /start
 * Start the scanner (admin only)
 */
router.post("/start", async (req, res) => {
  try {
    const { startBlock, batchSize, intervalMs } = req.body;
    await startScanner({ startBlock, batchSize, intervalMs });
    res.json({ success: true, message: "Scanner started" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /stop
 * Stop the scanner (admin only)
 */
router.post("/stop", (req, res) => {
  stopScanner();
  res.json({ success: true, message: "Scanner stopped" });
});

export default router;

