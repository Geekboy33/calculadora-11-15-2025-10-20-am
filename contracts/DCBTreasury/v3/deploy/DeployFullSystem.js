/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  DCB TREASURY - FULL SYSTEM DEPLOYMENT                                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain Mainnet                                                ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  This script deploys the complete DCB → LEMX → LUSD system:                                      ║
 * ║  1. USD - USD Token with ISO 20022 (First Signature)                                             ║
 * ║  2. LocksTreasuryLUSD - Lock Management (Second Signature)                                       ║
 * ║  3. LUSDMinting - Final Minting & Mint Explorer (Third Signature)                                ║
 * ║                                                                                                  ║
 * ║  Network: LemonChain Mainnet (Chain ID: 1005)                                                    ║
 * ║  LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                       ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const hre = require("hardhat");

// Configuration
const CONFIG = {
  NETWORK: {
    name: "LemonChain Mainnet",
    chainId: 1005,
    rpcUrl: "https://rpc.lemonchain.io",
    explorer: "https://explorer.lemonchain.io"
  },
  LUSD_CONTRACT: "0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99"
};

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                              ║");
  console.log("║     🏦 DCB TREASURY - FULL SYSTEM DEPLOYMENT                                 ║");
  console.log("║     Digital Commercial Bank Ltd                                              ║");
  console.log("║                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("📍 Network:", hre.network.name);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("🔗 Chain ID:", chainId.toString());

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: Deploy USD Contract
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    STEP 1: Deploy USD Contract                                ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const USD = await hre.ethers.getContractFactory("USD");
  console.log("📦 Deploying USD...");
  
  const usd = await USD.deploy(deployer.address);
  await usd.waitForDeployment();
  
  const usdAddress = await usd.getAddress();
  console.log("✅ USD deployed to:", usdAddress);
  
  console.log("\n📋 USD Contract Info:");
  console.log("   - Name:", await usd.name());
  console.log("   - Symbol:", await usd.symbol());
  console.log("   - Version:", await usd.VERSION());
  console.log("   - Institution:", await usd.INSTITUTION_NAME());
  console.log("   - ISO Currency:", await usd.ISO_CURRENCY_CODE());
  console.log("   - SWIFT BIC:", await usd.SWIFT_BIC());

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Deploy LocksTreasuryLUSD Contract
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                 STEP 2: Deploy LocksTreasuryLUSD Contract                     ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const LocksTreasuryLUSD = await hre.ethers.getContractFactory("LocksTreasuryLUSD");
  console.log("📦 Deploying LocksTreasuryLUSD...");
  
  const locksTreasury = await LocksTreasuryLUSD.deploy(deployer.address, usdAddress);
  await locksTreasury.waitForDeployment();
  
  const locksTreasuryAddress = await locksTreasury.getAddress();
  console.log("✅ LocksTreasuryLUSD deployed to:", locksTreasuryAddress);
  
  console.log("\n📋 LocksTreasuryLUSD Contract Info:");
  console.log("   - Version:", await locksTreasury.VERSION());
  console.log("   - Contract Name:", await locksTreasury.CONTRACT_NAME());
  console.log("   - USD Contract:", await locksTreasury.usdContract());
  console.log("   - LUSD Contract:", await locksTreasury.LUSD_CONTRACT());

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: Deploy LUSDMinting Contract
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                   STEP 3: Deploy LUSDMinting Contract                         ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const LUSDMinting = await hre.ethers.getContractFactory("LUSDMinting");
  console.log("📦 Deploying LUSDMinting...");
  
  const lusdMinting = await LUSDMinting.deploy(deployer.address, usdAddress, locksTreasuryAddress);
  await lusdMinting.waitForDeployment();
  
  const lusdMintingAddress = await lusdMinting.getAddress();
  console.log("✅ LUSDMinting deployed to:", lusdMintingAddress);
  
  console.log("\n📋 LUSDMinting Contract Info:");
  console.log("   - Version:", await lusdMinting.VERSION());
  console.log("   - Contract Name:", await lusdMinting.CONTRACT_NAME());
  console.log("   - USD Contract:", await lusdMinting.usdContract());
  console.log("   - LocksTreasury:", await lusdMinting.locksTreasuryContract());
  console.log("   - LUSD Contract:", await lusdMinting.LUSD_CONTRACT());
  console.log("   - Explorer URL:", await lusdMinting.EXPLORER_URL());

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: Link Contracts
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                       STEP 4: Link Contracts                                  ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Link USD → LocksTreasuryLUSD
  console.log("🔗 Linking USD → LocksTreasuryLUSD...");
  await usd.setLocksTreasuryLUSD(locksTreasuryAddress);
  console.log("   ✅ USD.locksTreasuryLUSD set to:", locksTreasuryAddress);

  // Link LocksTreasuryLUSD → LUSDMinting
  console.log("🔗 Linking LocksTreasuryLUSD → LUSDMinting...");
  await locksTreasury.setLUSDMintingContract(lusdMintingAddress);
  console.log("   ✅ LocksTreasuryLUSD.lusdMintingContract set to:", lusdMintingAddress);

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 5: Grant Roles
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         STEP 5: Grant Roles                                   ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Grant LOCK_MANAGER_ROLE to USD contract in LocksTreasuryLUSD
  const LOCK_MANAGER_ROLE = await locksTreasury.LOCK_MANAGER_ROLE();
  console.log("🔐 Granting LOCK_MANAGER_ROLE to USD contract...");
  await locksTreasury.grantRole(LOCK_MANAGER_ROLE, usdAddress);
  console.log("   ✅ LOCK_MANAGER_ROLE granted to:", usdAddress);

  // Grant MINTING_ROLE to LUSDMinting contract in LocksTreasuryLUSD
  const MINTING_ROLE = await locksTreasury.MINTING_ROLE();
  console.log("🔐 Granting MINTING_ROLE to LUSDMinting contract...");
  await locksTreasury.grantRole(MINTING_ROLE, lusdMintingAddress);
  console.log("   ✅ MINTING_ROLE granted to:", lusdMintingAddress);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         DEPLOYMENT SUMMARY                                    ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const summary = {
    network: {
      name: hre.network.name,
      chainId: chainId.toString()
    },
    deployer: deployer.address,
    contracts: {
      USD: usdAddress,
      LocksTreasuryLUSD: locksTreasuryAddress,
      LUSDMinting: lusdMintingAddress,
      LUSD_Reference: CONFIG.LUSD_CONTRACT
    },
    links: {
      "USD → LocksTreasuryLUSD": true,
      "LocksTreasuryLUSD → LUSDMinting": true
    },
    timestamp: new Date().toISOString()
  };

  console.log("📄 Deployment Summary:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                              ║");
  console.log("║  ✅ FULL SYSTEM DEPLOYMENT COMPLETE                                          ║");
  console.log("║                                                                              ║");
  console.log("║  📋 CONTRACTS DEPLOYED:                                                      ║");
  console.log("║  ├─ 💵 USD:              ", usdAddress.slice(0, 20) + "...              ║");
  console.log("║  ├─ 🔒 LocksTreasuryLUSD:", locksTreasuryAddress.slice(0, 20) + "...              ║");
  console.log("║  └─ 💎 LUSDMinting:      ", lusdMintingAddress.slice(0, 20) + "...              ║");
  console.log("║                                                                              ║");
  console.log("║  🔗 FLOW:                                                                    ║");
  console.log("║  USD → LocksTreasuryLUSD → LUSDMinting → Mint Explorer                       ║");
  console.log("║                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  return {
    usd: usdAddress,
    locksTreasury: locksTreasuryAddress,
    lusdMinting: lusdMintingAddress
  };
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎉 All contracts deployed and linked successfully!");
    console.log("   USD:", addresses.usd);
    console.log("   LocksTreasuryLUSD:", addresses.locksTreasury);
    console.log("   LUSDMinting:", addresses.lusdMinting);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
