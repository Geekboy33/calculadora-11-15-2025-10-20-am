/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🚀 DCB TREASURY - FULL TESTNET DEPLOYMENT SCRIPT                                                ║
 * ║  Digital Commercial Bank Ltd - LemonChain Testnet                                                ║
 * ║                                                                                                  ║
 * ║  This script deploys ALL contracts to LemonChain Testnet (Chain ID: 1006)                        ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

// Deployment configuration
const CONFIG = {
  network: "lemonchain-testnet",
  chainId: 1006,
  gasPrice: ethers.parseUnits("1", "gwei"),
  
  // Admin address (deployer)
  admin: null, // Will be set from signer
  
  // Contract parameters
  timelock: {
    minDelay: 60, // 1 minute for testnet (24 hours in mainnet)
    proposers: [],
    executors: []
  },
  
  governance: {
    votingPeriod: 300, // 5 minutes for testnet (3 days in mainnet)
    votingDelay: 60 // 1 minute for testnet
  },
  
  // Output paths
  outputDir: "./deployments",
  outputFile: "testnet-deployment.json"
};

// Deployed contracts storage
const deployedContracts = {
  network: CONFIG.network,
  chainId: CONFIG.chainId,
  deployedAt: new Date().toISOString(),
  deployer: "",
  contracts: {}
};

/**
 * Main deployment function
 */
async function main() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                                      ║");
  console.log("║  🏦 DCB TREASURY - TESTNET DEPLOYMENT                                                ║");
  console.log("║  LemonChain Testnet (Chain ID: 1006)                                                 ║");
  console.log("║                                                                                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get signer
  const [deployer] = await ethers.getSigners();
  CONFIG.admin = deployer.address;
  deployedContracts.deployer = deployer.address;

  console.log("📋 Deployment Configuration:");
  console.log(`   Network: ${CONFIG.network}`);
  console.log(`   Chain ID: ${CONFIG.chainId}`);
  console.log(`   Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} LEMON`);
  console.log("\n");

  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient balance. Need at least 0.1 LEMON for deployment.");
    process.exit(1);
  }

  try {
    // 1. Deploy Price Oracle
    console.log("═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("1️⃣  Deploying PriceOracleAggregator...");
    const priceOracle = await deployContract("PriceOracleAggregator", [
      deployer.address,
      ethers.ZeroAddress // No Chainlink on testnet, will use manual price
    ]);
    deployedContracts.contracts.PriceOracleAggregator = priceOracle.target;
    console.log(`   ✅ PriceOracleAggregator: ${priceOracle.target}`);

    // 2. Deploy KYC Registry
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("2️⃣  Deploying KYCComplianceRegistry...");
    const kycRegistry = await deployContract("KYCComplianceRegistry", [deployer.address]);
    deployedContracts.contracts.KYCComplianceRegistry = kycRegistry.target;
    console.log(`   ✅ KYCComplianceRegistry: ${kycRegistry.target}`);

    // 3. Deploy PQC Verifier
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("3️⃣  Deploying PostQuantumSignatureVerifier...");
    const pqcVerifier = await deployContract("PostQuantumSignatureVerifier", [deployer.address]);
    deployedContracts.contracts.PostQuantumSignatureVerifier = pqcVerifier.target;
    console.log(`   ✅ PostQuantumSignatureVerifier: ${pqcVerifier.target}`);

    // 4. Deploy Timelock
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("4️⃣  Deploying DCBTimelock...");
    const timelock = await deployContract("DCBTimelock", [
      deployer.address,
      [deployer.address], // proposers
      [deployer.address], // executors
      CONFIG.timelock.minDelay
    ]);
    deployedContracts.contracts.DCBTimelock = timelock.target;
    console.log(`   ✅ DCBTimelock: ${timelock.target}`);

    // 5. Deploy Governance
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("5️⃣  Deploying DCBGovernance...");
    const governance = await deployContract("DCBGovernance", [
      deployer.address,
      timelock.target,
      CONFIG.governance.votingPeriod,
      CONFIG.governance.votingDelay
    ]);
    deployedContracts.contracts.DCBGovernance = governance.target;
    console.log(`   ✅ DCBGovernance: ${governance.target}`);

    // 6. Deploy USD Token (Main Contract)
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("6️⃣  Deploying USD Token...");
    const usd = await deployContract("USD", [deployer.address]);
    deployedContracts.contracts.USD = usd.target;
    console.log(`   ✅ USD: ${usd.target}`);

    // 7. Deploy LocksTreasuryLUSD
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("7️⃣  Deploying LocksTreasuryLUSD...");
    const locksTreasury = await deployContract("LocksTreasuryLUSD", [
      deployer.address,
      usd.target
    ]);
    deployedContracts.contracts.LocksTreasuryLUSD = locksTreasury.target;
    console.log(`   ✅ LocksTreasuryLUSD: ${locksTreasury.target}`);

    // 8. Deploy LUSDMinting
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("8️⃣  Deploying LUSDMinting...");
    const lusdMinting = await deployContract("LUSDMinting", [
      deployer.address,
      usd.target,
      locksTreasury.target
    ]);
    deployedContracts.contracts.LUSDMinting = lusdMinting.target;
    console.log(`   ✅ LUSDMinting: ${lusdMinting.target}`);

    // 9. Configure contracts
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("9️⃣  Configuring contracts...");
    
    // Set LocksTreasuryLUSD in USD contract
    console.log("   → Setting LocksTreasuryLUSD in USD contract...");
    await usd.setLocksTreasuryLUSD(locksTreasury.target);
    
    // Set LUSDMinting contract in LocksTreasuryLUSD
    console.log("   → Setting LUSDMinting in LocksTreasuryLUSD...");
    await locksTreasury.setLUSDMintingContract(lusdMinting.target);
    
    // Add manual oracle for testnet
    console.log("   → Adding manual price oracle...");
    await priceOracle.addManualOracle("TESTNET_MANUAL", 100);
    
    // Whitelist deployer in KYC
    console.log("   → Whitelisting deployer in KYC registry...");
    await kycRegistry.addToWhitelist(deployer.address);
    
    // Set deployer as trusted PQC verifier
    console.log("   → Setting deployer as trusted PQC verifier...");
    await pqcVerifier.setTrustedVerifier(deployer.address, true);
    
    console.log("   ✅ All contracts configured!");

    // 10. Create test data
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("🔟  Creating test data...");
    
    // Create a test custody account
    console.log("   → Creating test custody account...");
    const createAccountTx = await usd.createCustodyAccount(
      "DCB Test Treasury",
      "Digital Commercial Bank",
      "DCBKUS33",
      "TEST-001-USD"
    );
    const receipt = await createAccountTx.wait();
    
    // Get account ID from event
    const accountCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = usd.interface.parseLog(log);
        return parsed?.name === "CustodyAccountCreated";
      } catch {
        return false;
      }
    });
    
    if (accountCreatedEvent) {
      const parsed = usd.interface.parseLog(accountCreatedEvent);
      deployedContracts.testData = {
        custodyAccountId: parsed.args[0],
        custodyAccountName: "DCB Test Treasury"
      };
      console.log(`   ✅ Test custody account created: ${parsed.args[0]}`);
      
      // Deposit test funds
      console.log("   → Depositing test funds (1,000,000 USD)...");
      await usd.recordCustodyDeposit(parsed.args[0], ethers.parseUnits("1000000", 6));
      console.log("   ✅ Test funds deposited!");
    }

    // Save deployment info
    console.log("\n═══════════════════════════════════════════════════════════════════════════════════════");
    console.log("💾  Saving deployment information...");
    await saveDeployment();

    // Print summary
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                                                                                      ║");
    console.log("║  ✅ DEPLOYMENT COMPLETE!                                                             ║");
    console.log("║                                                                                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                                      ║");
    console.log("║  📋 DEPLOYED CONTRACTS:                                                              ║");
    console.log("║                                                                                      ║");
    
    for (const [name, address] of Object.entries(deployedContracts.contracts)) {
      const paddedName = name.padEnd(30);
      console.log(`║     ${paddedName} ${address}   ║`);
    }
    
    console.log("║                                                                                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                                      ║");
    console.log("║  📁 Deployment saved to: ./deployments/testnet-deployment.json                       ║");
    console.log("║  🌐 Explorer: https://testnet.explorer.lemonchain.io                                 ║");
    console.log("║                                                                                      ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════════════╝");
    console.log("\n");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

/**
 * Deploy a contract
 */
async function deployContract(contractName, constructorArgs = []) {
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.deploy(...constructorArgs, {
    gasPrice: CONFIG.gasPrice
  });
  await contract.waitForDeployment();
  return contract;
}

/**
 * Save deployment information
 */
async function saveDeployment() {
  // Create output directory if it doesn't exist
  const outputDir = path.resolve(CONFIG.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON file
  const outputPath = path.join(outputDir, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(deployedContracts, null, 2));
  console.log(`   ✅ Saved to ${outputPath}`);

  // Also save to src for frontend integration
  const frontendPath = path.resolve("./src/contracts/testnet-addresses.json");
  const frontendDir = path.dirname(frontendPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(frontendPath, JSON.stringify(deployedContracts, null, 2));
  console.log(`   ✅ Saved to ${frontendPath}`);
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
