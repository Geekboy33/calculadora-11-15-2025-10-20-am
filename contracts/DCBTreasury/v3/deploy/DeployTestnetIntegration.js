/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🚀 DCB TREASURY - TESTNET DEPLOYMENT SCRIPT                                                     ║
 * ║  LemonChain Testnet (Chain ID: 1006)                                                             ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Deploys:                                                                                        ║
 * ║  ├─ 1. PriceOracleAggregator                                                                     ║
 * ║  ├─ 2. KYCComplianceRegistry                                                                     ║
 * ║  ├─ 3. PostQuantumSignatureVerifier                                                              ║
 * ║  ├─ 4. DCBTimelock                                                                               ║
 * ║  ├─ 5. USD (Main Token)                                                                          ║
 * ║  ├─ 6. LocksTreasuryLUSD                                                                         ║
 * ║  └─ 7. LUSDMinting                                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const CONFIG = {
  // Admin address (deployer)
  ADMIN: null, // Will be set from deployer
  
  // Timelock settings
  TIMELOCK_DELAY: 60 * 60, // 1 hour for testnet (faster testing)
  
  // Rate limits (lower for testnet)
  MAX_DAILY_INJECTION: ethers.parseUnits("100000", 6), // $100k for testnet
  
  // Output file for deployed addresses
  OUTPUT_FILE: "./deployed-addresses-testnet.json"
};

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  🚀 DCB TREASURY - TESTNET DEPLOYMENT                         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  CONFIG.ADMIN = deployer.address;
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Network: LemonChain Testnet (Chain ID: 1006)`);
  console.log(`   Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} LEMON\n`);

  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance. Need at least 0.1 LEMON for deployment.");
    console.log("   Get testnet LEMON from: https://faucet.testnet.lemonchain.io");
    process.exit(1);
  }

  const deployedAddresses = {};
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Deploy Price Oracle Aggregator
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("1️⃣  Deploying PriceOracleAggregator...");
    const PriceOracle = await ethers.getContractFactory("PriceOracleAggregator");
    const priceOracle = await PriceOracle.deploy(
      CONFIG.ADMIN,
      ethers.ZeroAddress // No Chainlink on testnet, will use manual price
    );
    await priceOracle.waitForDeployment();
    deployedAddresses.PriceOracleAggregator = await priceOracle.getAddress();
    console.log(`   ✅ PriceOracleAggregator: ${deployedAddresses.PriceOracleAggregator}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Deploy KYC Compliance Registry
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n2️⃣  Deploying KYCComplianceRegistry...");
    const KYCRegistry = await ethers.getContractFactory("KYCComplianceRegistry");
    const kycRegistry = await KYCRegistry.deploy(CONFIG.ADMIN);
    await kycRegistry.waitForDeployment();
    deployedAddresses.KYCComplianceRegistry = await kycRegistry.getAddress();
    console.log(`   ✅ KYCComplianceRegistry: ${deployedAddresses.KYCComplianceRegistry}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Deploy Post-Quantum Signature Verifier
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n3️⃣  Deploying PostQuantumSignatureVerifier...");
    const PQCVerifier = await ethers.getContractFactory("PostQuantumSignatureVerifier");
    const pqcVerifier = await PQCVerifier.deploy(CONFIG.ADMIN);
    await pqcVerifier.waitForDeployment();
    deployedAddresses.PostQuantumSignatureVerifier = await pqcVerifier.getAddress();
    console.log(`   ✅ PostQuantumSignatureVerifier: ${deployedAddresses.PostQuantumSignatureVerifier}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Deploy Timelock
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n4️⃣  Deploying DCBTimelock...");
    const Timelock = await ethers.getContractFactory("DCBTimelock");
    const timelock = await Timelock.deploy(
      CONFIG.ADMIN,
      [CONFIG.ADMIN], // proposers
      [CONFIG.ADMIN], // executors
      CONFIG.TIMELOCK_DELAY
    );
    await timelock.waitForDeployment();
    deployedAddresses.DCBTimelock = await timelock.getAddress();
    console.log(`   ✅ DCBTimelock: ${deployedAddresses.DCBTimelock}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Deploy USD Token (Main Contract)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n5️⃣  Deploying USD Token...");
    const USD = await ethers.getContractFactory("USD");
    const usd = await USD.deploy(CONFIG.ADMIN);
    await usd.waitForDeployment();
    deployedAddresses.USD = await usd.getAddress();
    console.log(`   ✅ USD: ${deployedAddresses.USD}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Deploy LocksTreasuryLUSD
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n6️⃣  Deploying LocksTreasuryLUSD...");
    const LocksTreasury = await ethers.getContractFactory("LocksTreasuryLUSD");
    const locksTreasury = await LocksTreasury.deploy(CONFIG.ADMIN, deployedAddresses.USD);
    await locksTreasury.waitForDeployment();
    deployedAddresses.LocksTreasuryLUSD = await locksTreasury.getAddress();
    console.log(`   ✅ LocksTreasuryLUSD: ${deployedAddresses.LocksTreasuryLUSD}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: Deploy LUSDMinting
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n7️⃣  Deploying LUSDMinting...");
    const LUSDMinting = await ethers.getContractFactory("LUSDMinting");
    const lusdMinting = await LUSDMinting.deploy(
      CONFIG.ADMIN,
      deployedAddresses.USD,
      deployedAddresses.LocksTreasuryLUSD
    );
    await lusdMinting.waitForDeployment();
    deployedAddresses.LUSDMinting = await lusdMinting.getAddress();
    console.log(`   ✅ LUSDMinting: ${deployedAddresses.LUSDMinting}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 8: Configure Contracts
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n8️⃣  Configuring contracts...");
    
    // Set LocksTreasuryLUSD in USD contract
    const usdContract = await ethers.getContractAt("USD", deployedAddresses.USD);
    await usdContract.setLocksTreasuryLUSD(deployedAddresses.LocksTreasuryLUSD);
    console.log("   ✅ USD → LocksTreasuryLUSD linked");

    // Set LUSDMinting in LocksTreasuryLUSD
    const locksContract = await ethers.getContractAt("LocksTreasuryLUSD", deployedAddresses.LocksTreasuryLUSD);
    await locksContract.setLUSDMintingContract(deployedAddresses.LUSDMinting);
    console.log("   ✅ LocksTreasuryLUSD → LUSDMinting linked");

    // Whitelist deployer in KYC for testing
    const kycContract = await ethers.getContractAt("KYCComplianceRegistry", deployedAddresses.KYCComplianceRegistry);
    await kycContract.addToWhitelist(CONFIG.ADMIN);
    console.log("   ✅ Admin whitelisted in KYC");

    // Add manual price oracle for testnet
    const oracleContract = await ethers.getContractAt("PriceOracleAggregator", deployedAddresses.PriceOracleAggregator);
    await oracleContract.addManualOracle("TESTNET_MANUAL", 100);
    console.log("   ✅ Manual oracle added");

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 9: Create Test Custody Account
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n9️⃣  Creating test custody account...");
    const tx = await usdContract.createCustodyAccount(
      "DCB Test Treasury",
      "Digital Commercial Bank",
      "DCBKUS33",
      "1234567890"
    );
    const receipt = await tx.wait();
    console.log("   ✅ Test custody account created");

    // ═══════════════════════════════════════════════════════════════════════════
    // SAVE DEPLOYED ADDRESSES
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Add metadata
    deployedAddresses.metadata = {
      network: "lemonchain-testnet",
      chainId: 1006,
      deployer: CONFIG.ADMIN,
      deployedAt: new Date().toISOString(),
      version: "2.0.0-TESTNET"
    };

    // Save to file
    const outputPath = path.join(__dirname, "..", "..", "..", "..", CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));
    console.log(`\n📁 Addresses saved to: ${CONFIG.OUTPUT_FILE}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ✅ DEPLOYMENT COMPLETE                                       ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  Deployed Contracts:                                          ║");
    console.log(`║  • PriceOracleAggregator:      ${deployedAddresses.PriceOracleAggregator.slice(0, 20)}...  ║`);
    console.log(`║  • KYCComplianceRegistry:      ${deployedAddresses.KYCComplianceRegistry.slice(0, 20)}...  ║`);
    console.log(`║  • PostQuantumSignatureVerifier: ${deployedAddresses.PostQuantumSignatureVerifier.slice(0, 18)}...  ║`);
    console.log(`║  • DCBTimelock:                ${deployedAddresses.DCBTimelock.slice(0, 20)}...  ║`);
    console.log(`║  • USD:                        ${deployedAddresses.USD.slice(0, 20)}...  ║`);
    console.log(`║  • LocksTreasuryLUSD:          ${deployedAddresses.LocksTreasuryLUSD.slice(0, 20)}...  ║`);
    console.log(`║  • LUSDMinting:                ${deployedAddresses.LUSDMinting.slice(0, 20)}...  ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    console.log("🔗 View on Explorer:");
    console.log(`   https://testnet.explorer.lemonchain.io/address/${deployedAddresses.USD}\n`);

    return deployedAddresses;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { main, CONFIG };

// Run if called directly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
