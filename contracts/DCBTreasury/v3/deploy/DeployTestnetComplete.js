/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🚀 DCB TREASURY - TESTNET DEPLOYMENT SCRIPT                                                     ║
 * ║  Digital Commercial Bank Ltd - LemonChain Testnet                                                ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Deploys:                                                                                        ║
 * ║  1. PriceOracleAggregator                                                                        ║
 * ║  2. KYCComplianceRegistry                                                                        ║
 * ║  3. DCBTimelock                                                                                  ║
 * ║  4. PostQuantumSignatureVerifier                                                                 ║
 * ║  5. DCBGovernance                                                                                ║
 * ║  6. USD_Enhanced (simplified for testnet)                                                        ║
 * ║  7. LocksTreasuryLUSD                                                                            ║
 * ║  8. LUSDMinting                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const CONFIG = {
  // Testnet settings (more relaxed for testing)
  VOTING_PERIOD: 60 * 60, // 1 hour for testnet (instead of 3 days)
  VOTING_DELAY: 60, // 1 minute for testnet
  TIMELOCK_DELAY: 60 * 5, // 5 minutes for testnet (instead of 24 hours)
  
  // LUSD contract address on LemonChain
  LUSD_CONTRACT: "0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99",
  
  // Output file for frontend integration
  OUTPUT_FILE: "deployed-contracts-testnet.json"
};

async function main() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                                      ║");
  console.log("║   🚀 DCB TREASURY - TESTNET DEPLOYMENT                                               ║");
  console.log("║   LemonChain Testnet (Chain ID: 1006)                                                ║");
  console.log("║                                                                                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  
  console.log("📋 Deployment Info:");
  console.log("├─ Deployer:", deployerAddress);
  console.log("├─ Balance:", ethers.formatEther(balance), "LEMON");
  console.log("├─ Network:", (await ethers.provider.getNetwork()).name);
  console.log("└─ Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("\n");

  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. Please fund the deployer address.");
    console.log("   Faucet: https://faucet.testnet.lemonchain.io");
    console.log("\n");
  }

  const deployedContracts = {};
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Deploy Price Oracle Aggregator
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("1️⃣  Deploying PriceOracleAggregator...");
    const PriceOracle = await ethers.getContractFactory("PriceOracleAggregator");
    const priceOracle = await PriceOracle.deploy(
      deployerAddress, // admin
      ethers.ZeroAddress // no Chainlink on testnet, will use manual price
    );
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("   ✅ PriceOracleAggregator:", priceOracleAddress);
    deployedContracts.PriceOracleAggregator = priceOracleAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Deploy KYC Compliance Registry
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("2️⃣  Deploying KYCComplianceRegistry...");
    const KYCRegistry = await ethers.getContractFactory("KYCComplianceRegistry");
    const kycRegistry = await KYCRegistry.deploy(deployerAddress);
    await kycRegistry.waitForDeployment();
    const kycRegistryAddress = await kycRegistry.getAddress();
    console.log("   ✅ KYCComplianceRegistry:", kycRegistryAddress);
    deployedContracts.KYCComplianceRegistry = kycRegistryAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Deploy Timelock Controller
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("3️⃣  Deploying DCBTimelock...");
    const Timelock = await ethers.getContractFactory("DCBTimelock");
    const timelock = await Timelock.deploy(
      deployerAddress, // admin
      [deployerAddress], // proposers
      [deployerAddress], // executors
      CONFIG.TIMELOCK_DELAY // delay
    );
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();
    console.log("   ✅ DCBTimelock:", timelockAddress);
    deployedContracts.DCBTimelock = timelockAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Deploy Post-Quantum Signature Verifier
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("4️⃣  Deploying PostQuantumSignatureVerifier...");
    const PQCVerifier = await ethers.getContractFactory("PostQuantumSignatureVerifier");
    const pqcVerifier = await PQCVerifier.deploy(deployerAddress);
    await pqcVerifier.waitForDeployment();
    const pqcVerifierAddress = await pqcVerifier.getAddress();
    console.log("   ✅ PostQuantumSignatureVerifier:", pqcVerifierAddress);
    deployedContracts.PostQuantumSignatureVerifier = pqcVerifierAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. Deploy Governance
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("5️⃣  Deploying DCBGovernance...");
    const Governance = await ethers.getContractFactory("DCBGovernance");
    const governance = await Governance.deploy(
      deployerAddress, // admin
      timelockAddress, // timelock
      CONFIG.VOTING_PERIOD, // voting period
      CONFIG.VOTING_DELAY // voting delay
    );
    await governance.waitForDeployment();
    const governanceAddress = await governance.getAddress();
    console.log("   ✅ DCBGovernance:", governanceAddress);
    deployedContracts.DCBGovernance = governanceAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. Deploy USD Enhanced
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("6️⃣  Deploying USD_Enhanced...");
    const USD = await ethers.getContractFactory("USD_Enhanced");
    const usd = await USD.deploy(deployerAddress);
    await usd.waitForDeployment();
    const usdAddress = await usd.getAddress();
    console.log("   ✅ USD_Enhanced:", usdAddress);
    deployedContracts.USD = usdAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Deploy Locks Treasury LUSD
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("7️⃣  Deploying LocksTreasuryLUSD...");
    const LocksTreasury = await ethers.getContractFactory("LocksTreasuryLUSD");
    const locksTreasury = await LocksTreasury.deploy(
      deployerAddress, // admin
      usdAddress // USD contract
    );
    await locksTreasury.waitForDeployment();
    const locksTreasuryAddress = await locksTreasury.getAddress();
    console.log("   ✅ LocksTreasuryLUSD:", locksTreasuryAddress);
    deployedContracts.LocksTreasuryLUSD = locksTreasuryAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. Deploy LUSD Minting
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("8️⃣  Deploying LUSDMinting...");
    const LUSDMinting = await ethers.getContractFactory("LUSDMinting");
    const lusdMinting = await LUSDMinting.deploy(
      deployerAddress, // admin
      usdAddress, // USD contract
      locksTreasuryAddress // Locks Treasury
    );
    await lusdMinting.waitForDeployment();
    const lusdMintingAddress = await lusdMinting.getAddress();
    console.log("   ✅ LUSDMinting:", lusdMintingAddress);
    deployedContracts.LUSDMinting = lusdMintingAddress;

    // ═══════════════════════════════════════════════════════════════════════════
    // Configure Contracts
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n📝 Configuring contracts...");

    // Set LocksTreasuryLUSD in USD contract
    console.log("   Setting LocksTreasuryLUSD in USD...");
    const usdContract = await ethers.getContractAt("USD_Enhanced", usdAddress);
    await usdContract.setLocksTreasuryLUSD(locksTreasuryAddress);

    // Set LUSDMinting in LocksTreasury
    console.log("   Setting LUSDMinting in LocksTreasury...");
    const locksContract = await ethers.getContractAt("LocksTreasuryLUSD", locksTreasuryAddress);
    await locksContract.setLUSDMintingContract(lusdMintingAddress);

    // Add deployer as trusted PQC verifier (for testnet)
    console.log("   Adding deployer as trusted PQC verifier...");
    const pqcContract = await ethers.getContractAt("PostQuantumSignatureVerifier", pqcVerifierAddress);
    await pqcContract.setTrustedVerifier(deployerAddress, true);

    // Whitelist deployer in KYC (for testnet)
    console.log("   Whitelisting deployer in KYC...");
    const kycContract = await ethers.getContractAt("KYCComplianceRegistry", kycRegistryAddress);
    await kycContract.addToWhitelist(deployerAddress);

    // Set voting power for deployer in governance
    console.log("   Setting voting power for deployer...");
    const govContract = await ethers.getContractAt("DCBGovernance", governanceAddress);
    await govContract.setVotingPower(deployerAddress, ethers.parseUnits("1000000", 6)); // 1M voting power

    console.log("   ✅ All configurations complete!");

    // ═══════════════════════════════════════════════════════════════════════════
    // Save deployment info
    // ═══════════════════════════════════════════════════════════════════════════
    const deploymentInfo = {
      network: "lemonchain-testnet",
      chainId: 1006,
      deployedAt: new Date().toISOString(),
      deployer: deployerAddress,
      contracts: deployedContracts,
      config: {
        votingPeriod: CONFIG.VOTING_PERIOD,
        votingDelay: CONFIG.VOTING_DELAY,
        timelockDelay: CONFIG.TIMELOCK_DELAY,
        lusdContract: CONFIG.LUSD_CONTRACT
      },
      explorer: "https://testnet.explorer.lemonchain.io"
    };

    // Save to file
    const outputPath = path.join(__dirname, "..", "..", "..", "..", CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", outputPath);

    // ═══════════════════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                                                                                      ║");
    console.log("║   ✅ DEPLOYMENT COMPLETE!                                                            ║");
    console.log("║                                                                                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                                      ║");
    console.log("║   📋 Deployed Contracts:                                                             ║");
    console.log("║                                                                                      ║");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      const paddedName = name.padEnd(30);
      console.log(`║   ├─ ${paddedName} ${address}   ║`);
    });
    console.log("║                                                                                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                                      ║");
    console.log("║   🔗 Explorer Links:                                                                 ║");
    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`║   ${name}:`);
      console.log(`║   https://testnet.explorer.lemonchain.io/address/${address}`);
    });
    console.log("║                                                                                      ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════════════╝");
    console.log("\n");

    return deploymentInfo;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
