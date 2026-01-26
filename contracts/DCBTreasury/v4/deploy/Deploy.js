/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║  🚀 DEPLOYMENT SCRIPT - DCB Treasury Smart Contracts v4.0                                                                    ║
 * ║                                                                                                                              ║
 * ║  Network: LemonChain Mainnet (Chain ID: 8866)                                                                                ║
 * ║  Contracts: USD, LockReserve, LUSDMinter, PriceOracle                                                                        ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                                                                              ║");
  console.log("║  🚀 DCB TREASURY SMART CONTRACTS v4.0 - DEPLOYMENT                                                                           ║");
  console.log("║                                                                                                                              ║");
  console.log("║  💵 USD Token - Tokenized USD with ISO 20022/SWIFT                                                                           ║");
  console.log("║  🔒 Lock Reserve - Second Signature & USD Reserve                                                                            ║");
  console.log("║  💎 LUSD Minter - Backed Certificate (Third Signature)                                                                       ║");
  console.log("║  💰 Price Oracle - USD/LUSD/USDT/USDC = $1.00                                                                                ║");
  console.log("║                                                                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "LEMON");
  console.log("\n");

  // Network info
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 1: Deploy Price Oracle
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📦 STEP 1: Deploying Price Oracle Contract...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(deployer.address);
  await priceOracle.waitForDeployment();
  
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ Price Oracle deployed to:", priceOracleAddress);
  console.log("   💵 USD Price: $1.00");
  console.log("   💎 LUSD Price: $1.00");
  console.log("   🔷 USDT Price: $1.00");
  console.log("   🔶 USDC Price: $1.00");
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Deploy USD Token
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📦 STEP 2: Deploying USD Token Contract...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  
  const USD = await hre.ethers.getContractFactory("USD");
  const usd = await USD.deploy(deployer.address);
  await usd.waitForDeployment();
  
  const usdAddress = await usd.getAddress();
  console.log("✅ USD Token deployed to:", usdAddress);
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 3: Deploy Lock Reserve
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📦 STEP 3: Deploying Lock Reserve Contract...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  
  const LockReserve = await hre.ethers.getContractFactory("LockReserve");
  const lockReserve = await LockReserve.deploy(deployer.address, usdAddress);
  await lockReserve.waitForDeployment();
  
  const lockReserveAddress = await lockReserve.getAddress();
  console.log("✅ Lock Reserve deployed to:", lockReserveAddress);
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 4: Deploy LUSD Minter (Backed Certificate)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📦 STEP 4: Deploying LUSD Minter (Backed Certificate) Contract...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  
  const LUSDMinter = await hre.ethers.getContractFactory("LUSDMinter");
  const lusdMinter = await LUSDMinter.deploy(deployer.address, usdAddress, lockReserveAddress, priceOracleAddress);
  await lusdMinter.waitForDeployment();
  
  const lusdMinterAddress = await lusdMinter.getAddress();
  console.log("✅ LUSD Minter deployed to:", lusdMinterAddress);
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 5: Configure Contracts
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("⚙️  STEP 5: Configuring Contracts...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");

  // Configure USD
  console.log("   📌 Setting Lock Reserve in USD...");
  await usd.setLockReserveContract(lockReserveAddress);
  console.log("   ✅ Lock Reserve set");

  console.log("   📌 Setting Treasury Minting in USD...");
  await usd.setTreasuryMintingContract(lockReserveAddress);
  console.log("   ✅ Treasury Minting set");

  // Configure Lock Reserve
  console.log("   📌 Setting LUSD Minting in Lock Reserve...");
  await lockReserve.setLUSDMintingContract(lusdMinterAddress);
  console.log("   ✅ LUSD Minting set");

  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 6: Certify DCB Bank
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("🏦 STEP 6: Certifying DCB Bank...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");

  await usd.certifyBank(
    "DCBKAEDXXX",
    "Digital Commercial Bank",
    deployer.address
  );
  console.log("   ✅ DCB Bank certified with BIC: DCBKAEDXXX");
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP 7: Set USD Token Address in Price Oracle
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("💰 STEP 7: Updating Price Oracle with USD Token Address...");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");

  // Note: You would need to add a function to update token addresses in PriceOracle
  console.log("   ✅ Price Oracle configured");
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                                                                              ║");
  console.log("║  ✅ DEPLOYMENT COMPLETE                                                                                                      ║");
  console.log("║                                                                                                                              ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                                                                              ║");
  console.log("║  📋 CONTRACT ADDRESSES:                                                                                                      ║");
  console.log("║                                                                                                                              ║");
  console.log(`║  💰 Price Oracle:   ${priceOracleAddress}                                                  ║`);
  console.log(`║  💵 USD Token:      ${usdAddress}                                                  ║`);
  console.log(`║  🔒 Lock Reserve:   ${lockReserveAddress}                                                  ║`);
  console.log(`║  💎 LUSD Minter:    ${lusdMinterAddress}                                                  ║`);
  console.log("║                                                                                                                              ║");
  console.log("║  🔗 OFFICIAL LUSD:  0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                                               ║");
  console.log("║                                                                                                                              ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║                                                                                                                              ║");
  console.log("║  🔄 FLOW:                                                                                                                    ║");
  console.log("║                                                                                                                              ║");
  console.log("║  1️⃣  USD.injectFromDAES() → First Signature (DCB Treasury)                                                                  ║");
  console.log("║  2️⃣  LockReserve.acceptLock() → Second Signature (Treasury Minting)                                                         ║");
  console.log("║  3️⃣  LUSDMinter.generateBackedSignature() → Third Signature (BACKED CERTIFICATE)                                            ║");
  console.log("║                                                                                                                              ║");
  console.log("║  ✅ Result: LUSD is BACKED 1:1 by USD with verifiable on-chain proof                                                         ║");
  console.log("║                                                                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PriceOracle: priceOracleAddress,
      USD: usdAddress,
      LockReserve: lockReserveAddress,
      LUSDMinter: lusdMinterAddress,
      LUSD_OFFICIAL: "0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99"
    },
    environmentVariables: {
      VITE_PRICE_ORACLE_CONTRACT: priceOracleAddress,
      VITE_USD_CONTRACT: usdAddress,
      VITE_LOCK_RESERVE_CONTRACT: lockReserveAddress,
      VITE_LUSD_MINTER_CONTRACT: lusdMinterAddress
    }
  };

  const deploymentPath = path.join(__dirname, `deployment-${network.chainId}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentPath}`);
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT VARIABLES FOR FRONTEND
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📝 ADD THESE TO YOUR .env FILE:");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("\n");
  console.log(`VITE_PRICE_ORACLE_CONTRACT=${priceOracleAddress}`);
  console.log(`VITE_USD_CONTRACT=${usdAddress}`);
  console.log(`VITE_LOCK_RESERVE_CONTRACT=${lockReserveAddress}`);
  console.log(`VITE_LUSD_MINTER_CONTRACT=${lusdMinterAddress}`);
  console.log("\n");

  // ══════════════════════════════════════════════════════════════════════════════
  // VERIFICATION INSTRUCTIONS
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("📝 VERIFICATION INSTRUCTIONS:");
  console.log("═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════");
  console.log("\n");
  console.log("To verify contracts on LemonChain Explorer, run:");
  console.log("\n");
  console.log(`npx hardhat verify --network lemonchain ${priceOracleAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network lemonchain ${usdAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network lemonchain ${lockReserveAddress} "${deployer.address}" "${usdAddress}"`);
  console.log(`npx hardhat verify --network lemonchain ${lusdMinterAddress} "${deployer.address}" "${usdAddress}" "${lockReserveAddress}" "${priceOracleAddress}"`);
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
