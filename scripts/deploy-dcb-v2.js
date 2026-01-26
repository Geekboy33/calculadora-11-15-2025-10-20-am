/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   DCB TREASURY CONTRACTS v2.0.0 - DEPLOYMENT SCRIPT                           ║
 * ║   Digital Commercial Bank Ltd - LemonChain                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This script deploys the complete DCB Treasury contract suite:
 * - LUSD: Lemon USD Stablecoin
 * - BankRegistry: Financial Institution Registry
 * - LockBox: Secure USD Custody
 * - PriceOracle: USD/USDT Price Feed
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-dcb-v2.js --network lemonchain
 * 
 * Environment Variables:
 *   DEPLOYER_PRIVATE_KEY: Private key for deployment
 *   LEMONCHAIN_RPC_URL: RPC endpoint for LemonChain
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Admin address (receives all roles initially)
  admin: process.env.ADMIN_ADDRESS || null, // Will use deployer if not set
  
  // Initial approvers for BankRegistry
  initialApprovers: [
    // Add additional approvers here if needed
  ],
  
  // Initial signers for LockBox
  initialSigners: [
    // Add additional signers here if needed
  ],
  
  // Initial operators for PriceOracle
  initialOperators: [
    // Add additional operators here if needed
  ],
  
  // Required approvals/signatures
  requiredApprovals: 1,
  requiredSignatures: 1,
  
  // Gas settings
  gasLimit: 5000000,
  
  // Verification delay (ms)
  verificationDelay: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOYMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║   DCB TREASURY CONTRACTS v2.0.0 - DEPLOYMENT                                  ║");
  console.log("║   Digital Commercial Bank Ltd - LemonChain                                    ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  const adminAddress = CONFIG.admin || deployer.address;
  
  console.log("📋 Deployment Configuration:");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`   Network:     ${hre.network.name}`);
  console.log(`   Chain ID:    ${(await hre.ethers.provider.getNetwork()).chainId}`);
  console.log(`   Deployer:    ${deployer.address}`);
  console.log(`   Admin:       ${adminAddress}`);
  console.log(`   Balance:     ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} LEMX`);
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const deployedContracts = {};

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Deploy LUSD Token
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🚀 [1/4] Deploying LUSD Token...");
  
  const LUSD = await hre.ethers.getContractFactory("contracts/DCBTreasury/v2/LUSD.sol:LUSD");
  const lusd = await LUSD.deploy(adminAddress, { gasLimit: CONFIG.gasLimit });
  await lusd.waitForDeployment();
  
  const lusdAddress = await lusd.getAddress();
  deployedContracts.LUSD = {
    address: lusdAddress,
    constructorArgs: [adminAddress],
  };
  
  console.log(`   ✅ LUSD deployed at: ${lusdAddress}`);
  console.log(`   📝 Name: Lemon USD`);
  console.log(`   📝 Symbol: LUSD`);
  console.log(`   📝 Decimals: 6\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Deploy BankRegistry
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🚀 [2/4] Deploying BankRegistry...");
  
  const BankRegistry = await hre.ethers.getContractFactory("contracts/DCBTreasury/v2/BankRegistry.sol:BankRegistry");
  const bankRegistry = await BankRegistry.deploy(
    adminAddress,
    CONFIG.initialApprovers,
    CONFIG.requiredApprovals,
    { gasLimit: CONFIG.gasLimit }
  );
  await bankRegistry.waitForDeployment();
  
  const bankRegistryAddress = await bankRegistry.getAddress();
  deployedContracts.BankRegistry = {
    address: bankRegistryAddress,
    constructorArgs: [adminAddress, CONFIG.initialApprovers, CONFIG.requiredApprovals],
  };
  
  console.log(`   ✅ BankRegistry deployed at: ${bankRegistryAddress}`);
  console.log(`   📝 Required Approvals: ${CONFIG.requiredApprovals}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Deploy LockBox
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🚀 [3/4] Deploying LockBox...");
  
  const LockBox = await hre.ethers.getContractFactory("contracts/DCBTreasury/v2/LockBox.sol:LockBox");
  const lockBox = await LockBox.deploy(
    lusdAddress, // Use LUSD as the token
    adminAddress,
    CONFIG.initialSigners,
    CONFIG.requiredSignatures,
    { gasLimit: CONFIG.gasLimit }
  );
  await lockBox.waitForDeployment();
  
  const lockBoxAddress = await lockBox.getAddress();
  deployedContracts.LockBox = {
    address: lockBoxAddress,
    constructorArgs: [lusdAddress, adminAddress, CONFIG.initialSigners, CONFIG.requiredSignatures],
  };
  
  console.log(`   ✅ LockBox deployed at: ${lockBoxAddress}`);
  console.log(`   📝 USD Token: ${lusdAddress}`);
  console.log(`   📝 Required Signatures: ${CONFIG.requiredSignatures}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Deploy PriceOracle
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("🚀 [4/4] Deploying PriceOracle...");
  
  const PriceOracle = await hre.ethers.getContractFactory("contracts/DCBTreasury/v2/PriceOracle.sol:PriceOracle");
  const priceOracle = await PriceOracle.deploy(
    adminAddress,
    CONFIG.initialOperators,
    { gasLimit: CONFIG.gasLimit }
  );
  await priceOracle.waitForDeployment();
  
  const priceOracleAddress = await priceOracle.getAddress();
  deployedContracts.PriceOracle = {
    address: priceOracleAddress,
    constructorArgs: [adminAddress, CONFIG.initialOperators],
  };
  
  console.log(`   ✅ PriceOracle deployed at: ${priceOracleAddress}`);
  console.log(`   📝 Initial Price: $1.00 (100000000)\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Configure LUSD Oracle
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("⚙️  Configuring LUSD Oracle...");
  
  const lusdContract = await hre.ethers.getContractAt("contracts/DCBTreasury/v2/LUSD.sol:LUSD", lusdAddress);
  const setOracleTx = await lusdContract.setOracle(priceOracleAddress);
  await setOracleTx.wait();
  
  console.log(`   ✅ LUSD Oracle set to: ${priceOracleAddress}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║   DEPLOYMENT COMPLETE                                                         ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");
  console.log("📋 Deployed Contracts:");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`   LUSD:         ${deployedContracts.LUSD.address}`);
  console.log(`   BankRegistry: ${deployedContracts.BankRegistry.address}`);
  console.log(`   LockBox:      ${deployedContracts.LockBox.address}`);
  console.log(`   PriceOracle:  ${deployedContracts.PriceOracle.address}`);
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    admin: adminAddress,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
  };

  const outputPath = path.join(__dirname, `../deployments/dcb-v2-${hre.network.name}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`📁 Deployment info saved to: ${outputPath}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Verification Instructions
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("📋 Verification Commands:");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`\n# LUSD`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${lusdAddress} "${adminAddress}"`);
  console.log(`\n# BankRegistry`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${bankRegistryAddress} "${adminAddress}" "[]" "${CONFIG.requiredApprovals}"`);
  console.log(`\n# LockBox`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${lockBoxAddress} "${lusdAddress}" "${adminAddress}" "[]" "${CONFIG.requiredSignatures}"`);
  console.log(`\n# PriceOracle`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${priceOracleAddress} "${adminAddress}" "[]"`);
  console.log("\n═══════════════════════════════════════════════════════════════════════════════\n");

  return deployedContracts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════════════════

main()
  .then((contracts) => {
    console.log("✅ Deployment successful!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
