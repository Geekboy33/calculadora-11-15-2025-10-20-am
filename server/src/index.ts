/**
 * DAES Backend Server
 *
 * Modules:
 * - /api/dusd: Arbitrum dUSD Bridge (dUSD Mint) - Optional
 * - /api/ethusd: Ethereum USD/USDT Operations (USDT Converter) - Active
 *
 * ⚠️ SECURITY:
 * - beneficiary es SERVER-SIDE ONLY
 * - Las firmas nunca se exponen al frontend
 */

// Load environment variables FIRST - MUST be before any other imports!
import "./env.js";

import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Track loaded modules
const loadedModules: { name: string; path: string }[] = [];

// dUSD Routes (Arbitrum) - Optional, load only if configured
let dusdRoutes: any = null;
async function loadDusdRoutes() {
  try {
    // Check if required env vars are set
    if (!process.env.DAES_SIGNER_PRIVATE_KEY || 
        !process.env.OPERATOR_PRIVATE_KEY ||
        !process.env.BRIDGE_MINTER_ADDRESS) {
      console.log("⚠️ dUSD Module not configured - skipping");
      return;
    }
    
    const module = await import("./routes/dusd.js");
    dusdRoutes = module.default;
    console.log("✅ dUSD Module (Arbitrum) loaded");
  } catch (e: any) {
    console.log("⚠️ dUSD Module failed to load:", e.message);
  }
}

// ETH USD Module routes (USDT Converter)
let ethUsdMintRouter: any = null;
let ethUsdScanRouter: any = null;

async function loadEthUsdRoutes() {
  try {
    const ethUsdModule = await import("./modules/ethusd/index.js");
    ethUsdMintRouter = ethUsdModule.ethUsdMintRouter;
    ethUsdScanRouter = ethUsdModule.ethUsdScanRouter;
    console.log("✅ ETH USD Module (USDT Converter) loaded");
  } catch (e: any) {
    console.log("⚠️ ETH USD Module failed to load:", e.message);
  }
}

// Health check
app.get("/health", (_, res) => res.json({ 
  ok: true, 
  service: "DAES Backend",
  modules: {
    dusd: dusdRoutes ? "enabled" : "disabled",
    ethusd: ethUsdMintRouter ? "enabled" : "disabled"
  },
  loadedModules
}));

// Initialize and start server
async function start() {
  console.log("\n🚀 Starting DAES Backend Server...\n");

  // Load modules
  await Promise.all([
    loadDusdRoutes(),
    loadEthUsdRoutes()
  ]);

  // Register dUSD routes if available
  if (dusdRoutes) {
    app.use("/api/dusd", dusdRoutes);
    loadedModules.push({ name: "dUSD (Arbitrum)", path: "/api/dusd" });
    console.log("  → /api/dusd (Arbitrum dUSD Mint)");
  }

  // Register ETH USD routes if available (USDT Converter)
  if (ethUsdMintRouter) {
    app.use("/api/ethusd", ethUsdMintRouter);
    loadedModules.push({ name: "ETH USD (USDT Converter)", path: "/api/ethusd" });
    console.log("  → /api/ethusd (USDT Converter & Mint routes)");
  }
  if (ethUsdScanRouter) {
    app.use("/api/ethusd/scan", ethUsdScanRouter);
    loadedModules.push({ name: "ETH USD Scanner", path: "/api/ethusd/scan" });
    console.log("  → /api/ethusd/scan (Scanner routes)");
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`\n✅ DAES backend running on http://localhost:${port}`);
    console.log(`   Loaded ${loadedModules.length} module(s)\n`);
  });
}

start().catch(console.error);
