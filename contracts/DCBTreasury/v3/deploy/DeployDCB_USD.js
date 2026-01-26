/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  DCB USD ISO 20022 - DEPLOYMENT SCRIPT                                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain Mainnet                                                ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  This script deploys:                                                                            ║
 * ║  1. MultiStablecoinOracle - Price oracle for USDT, USDC, VUSD, LUSD, DAI, FRAX, TUSD           ║
 * ║  2. DCB_USD_ISO20022 - Main USD token with ISO 20022 messaging                                   ║
 * ║                                                                                                  ║
 * ║  Network: LemonChain Mainnet (Chain ID: 1005)                                                    ║
 * ║  LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                       ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const hre = require("hardhat");

// Configuration
const CONFIG = {
  // LemonChain Mainnet
  NETWORK: {
    name: "LemonChain Mainnet",
    chainId: 1005,
    rpcUrl: "https://rpc.lemonchain.io",
    explorer: "https://explorer.lemonchain.io"
  },
  
  // Existing contracts
  LUSD_CONTRACT: "0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99",
  
  // Admin address (deployer)
  ADMIN_ADDRESS: null, // Will be set from deployer
  
  // Initial oracle price feeds (all at $1.00 = 1,000,000)
  INITIAL_PRICES: {
    USDT: 1000000,
    USDC: 1000000,
    LUSD: 1000000,
    VUSD: 1000000,
    DAI: 1000000,
    FRAX: 1000000,
    TUSD: 1000000
  }
};

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                              ║");
  console.log("║     🏦 DCB USD ISO 20022 - DEPLOYMENT                                        ║");
  console.log("║     Digital Commercial Bank Ltd                                              ║");
  console.log("║                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  CONFIG.ADMIN_ADDRESS = deployer.address;
  
  console.log("📍 Network:", hre.network.name);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Verify network
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("🔗 Chain ID:", chainId.toString());
  
  if (chainId !== BigInt(CONFIG.NETWORK.chainId)) {
    console.log("⚠️  Warning: Not on LemonChain Mainnet. Current chain:", chainId.toString());
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    STEP 1: Deploy MultiStablecoinOracle                       ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const MultiStablecoinOracle = await hre.ethers.getContractFactory("MultiStablecoinOracle");
  console.log("📦 Deploying MultiStablecoinOracle...");
  
  const oracle = await MultiStablecoinOracle.deploy(CONFIG.ADMIN_ADDRESS);
  await oracle.waitForDeployment();
  
  const oracleAddress = await oracle.getAddress();
  console.log("✅ MultiStablecoinOracle deployed to:", oracleAddress);
  
  // Verify oracle statistics
  const oracleStats = await oracle.getStatistics();
  console.log("\n📊 Oracle Statistics:");
  console.log("   - Total Feeds:", oracleStats[0].toString());
  console.log("   - Active Feeds:", oracleStats[1].toString());
  console.log("   - Total Weight:", oracleStats[2].toString());
  console.log("   - Average Price:", oracleStats[3].toString(), "(should be 1000000)");
  console.log("   - Healthy Count:", oracleStats[4].toString());

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                     STEP 2: Deploy DCB_USD_ISO20022                           ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const DCB_USD = await hre.ethers.getContractFactory("DCB_USD_ISO20022");
  console.log("📦 Deploying DCB_USD_ISO20022...");
  
  const dcbUsd = await DCB_USD.deploy(CONFIG.ADMIN_ADDRESS, oracleAddress);
  await dcbUsd.waitForDeployment();
  
  const dcbUsdAddress = await dcbUsd.getAddress();
  console.log("✅ DCB_USD_ISO20022 deployed to:", dcbUsdAddress);
  
  // Verify contract info
  console.log("\n📋 Contract Info:");
  console.log("   - Name:", await dcbUsd.name());
  console.log("   - Symbol:", await dcbUsd.symbol());
  console.log("   - Decimals:", await dcbUsd.decimals());
  console.log("   - Version:", await dcbUsd.VERSION());
  console.log("   - ISO Institution:", await dcbUsd.ISO_INSTITUTION_NAME());
  console.log("   - ISO Currency:", await dcbUsd.ISO_CURRENCY_CODE());
  console.log("   - SWIFT BIC:", await dcbUsd.SWIFT_BIC());
  console.log("   - LUSD Contract:", await dcbUsd.LUSD_CONTRACT());

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                          STEP 3: Verify Roles                                 ");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const MINTER_ROLE = await dcbUsd.MINTER_ROLE();
  const BURNER_ROLE = await dcbUsd.BURNER_ROLE();
  const CUSTODY_MANAGER_ROLE = await dcbUsd.CUSTODY_MANAGER_ROLE();
  const ISO_VALIDATOR_ROLE = await dcbUsd.ISO_VALIDATOR_ROLE();
  const DAES_OPERATOR_ROLE = await dcbUsd.DAES_OPERATOR_ROLE();
  
  console.log("🔐 Roles assigned to admin:", CONFIG.ADMIN_ADDRESS);
  console.log("   ✅ MINTER_ROLE:", await dcbUsd.hasRole(MINTER_ROLE, CONFIG.ADMIN_ADDRESS));
  console.log("   ✅ BURNER_ROLE:", await dcbUsd.hasRole(BURNER_ROLE, CONFIG.ADMIN_ADDRESS));
  console.log("   ✅ CUSTODY_MANAGER_ROLE:", await dcbUsd.hasRole(CUSTODY_MANAGER_ROLE, CONFIG.ADMIN_ADDRESS));
  console.log("   ✅ ISO_VALIDATOR_ROLE:", await dcbUsd.hasRole(ISO_VALIDATOR_ROLE, CONFIG.ADMIN_ADDRESS));
  console.log("   ✅ DAES_OPERATOR_ROLE:", await dcbUsd.hasRole(DAES_OPERATOR_ROLE, CONFIG.ADMIN_ADDRESS));

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
      MultiStablecoinOracle: oracleAddress,
      DCB_USD_ISO20022: dcbUsdAddress,
      LUSD_Reference: CONFIG.LUSD_CONTRACT
    },
    timestamp: new Date().toISOString()
  };

  console.log("📄 Deployment Summary:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                              ║");
  console.log("║  ✅ DEPLOYMENT COMPLETE                                                      ║");
  console.log("║                                                                              ║");
  console.log("║  🔮 MultiStablecoinOracle:", oracleAddress.slice(0, 20) + "...                   ║");
  console.log("║  💵 DCB_USD_ISO20022:      ", dcbUsdAddress.slice(0, 20) + "...                   ║");
  console.log("║                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  // Return addresses for verification
  return {
    oracle: oracleAddress,
    dcbUsd: dcbUsdAddress
  };
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎉 All contracts deployed successfully!");
    console.log("   Oracle:", addresses.oracle);
    console.log("   DCB-USD:", addresses.dcbUsd);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
