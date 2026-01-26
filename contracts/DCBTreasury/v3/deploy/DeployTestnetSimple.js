/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🚀 DCB TREASURY - TESTNET DEPLOYMENT SCRIPT                                                     ║
 * ║  Deploy simplified contracts for frontend integration testing                                    ║
 * ║                                                                                                  ║
 * ║  Network: LemonChain Testnet (Chain ID: 1006)                                                    ║
 * ║  RPC: https://rpc.testnet.lemonchain.io                                                          ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  network: "lemonchain-testnet",
  gasPrice: 1000000000, // 1 gwei
  gasLimit: 8000000,
  admin: null, // Will be set from deployer
};

// Deployed addresses storage
const DEPLOYED_ADDRESSES = {};

async function main() {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                                                              ║");
  console.log("║   🏦 DCB TREASURY - TESTNET DEPLOYMENT                                       ║");
  console.log("║   Digital Commercial Bank Ltd                                                ║");
  console.log("║                                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  CONFIG.admin = deployer.address;

  console.log("📋 Deployment Configuration:");
  console.log("├─ Network:", hre.network.name);
  console.log("├─ Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("├─ Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("├─ Balance:", hre.ethers.formatEther(balance), "LEMON");
  console.log("└─ Gas Price:", CONFIG.gasPrice / 1e9, "gwei");
  console.log("\n");

  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You may need more LEMON for deployment.");
  }

  try {
    // Step 1: Deploy USD Token
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("📦 STEP 1: Deploying USD Token...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    
    const USD = await hre.ethers.getContractFactory("contracts/DCBTreasury/v3/USD.sol:USD");
    const usd = await USD.deploy(CONFIG.admin, {
      gasPrice: CONFIG.gasPrice,
      gasLimit: CONFIG.gasLimit
    });
    await usd.waitForDeployment();
    
    DEPLOYED_ADDRESSES.USD = await usd.getAddress();
    console.log("✅ USD Token deployed at:", DEPLOYED_ADDRESSES.USD);
    console.log("\n");

    // Step 2: Deploy LocksTreasuryLUSD
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("📦 STEP 2: Deploying LocksTreasuryLUSD...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    
    const LocksTreasury = await hre.ethers.getContractFactory("contracts/DCBTreasury/v3/LocksTreasuryLUSD.sol:LocksTreasuryLUSD");
    const locksTreasury = await LocksTreasury.deploy(CONFIG.admin, DEPLOYED_ADDRESSES.USD, {
      gasPrice: CONFIG.gasPrice,
      gasLimit: CONFIG.gasLimit
    });
    await locksTreasury.waitForDeployment();
    
    DEPLOYED_ADDRESSES.LocksTreasuryLUSD = await locksTreasury.getAddress();
    console.log("✅ LocksTreasuryLUSD deployed at:", DEPLOYED_ADDRESSES.LocksTreasuryLUSD);
    console.log("\n");

    // Step 3: Deploy LUSDMinting
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("📦 STEP 3: Deploying LUSDMinting...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    
    const LUSDMinting = await hre.ethers.getContractFactory("contracts/DCBTreasury/v3/LUSDMinting.sol:LUSDMinting");
    const lusdMinting = await LUSDMinting.deploy(
      CONFIG.admin,
      DEPLOYED_ADDRESSES.USD,
      DEPLOYED_ADDRESSES.LocksTreasuryLUSD,
      {
        gasPrice: CONFIG.gasPrice,
        gasLimit: CONFIG.gasLimit
      }
    );
    await lusdMinting.waitForDeployment();
    
    DEPLOYED_ADDRESSES.LUSDMinting = await lusdMinting.getAddress();
    console.log("✅ LUSDMinting deployed at:", DEPLOYED_ADDRESSES.LUSDMinting);
    console.log("\n");

    // Step 4: Configure contracts
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("⚙️  STEP 4: Configuring contracts...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    // Set LocksTreasuryLUSD in USD contract
    console.log("├─ Setting LocksTreasuryLUSD in USD contract...");
    const setLocksTx = await usd.setLocksTreasuryLUSD(DEPLOYED_ADDRESSES.LocksTreasuryLUSD, {
      gasPrice: CONFIG.gasPrice
    });
    await setLocksTx.wait();
    console.log("│  ✅ Done");

    // Set LUSDMinting in LocksTreasuryLUSD
    console.log("├─ Setting LUSDMinting in LocksTreasuryLUSD...");
    const setMintingTx = await locksTreasury.setLUSDMintingContract(DEPLOYED_ADDRESSES.LUSDMinting, {
      gasPrice: CONFIG.gasPrice
    });
    await setMintingTx.wait();
    console.log("│  ✅ Done");

    console.log("└─ All configurations complete!");
    console.log("\n");

    // Step 5: Create test custody account
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("🏦 STEP 5: Creating test custody account...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    const createAccountTx = await usd.createCustodyAccount(
      "DCB Test Treasury",
      "Digital Commercial Bank",
      "DCBKUS33",
      "1234567890",
      { gasPrice: CONFIG.gasPrice }
    );
    const receipt = await createAccountTx.wait();
    
    // Get account ID from event
    const event = receipt.logs.find(log => {
      try {
        return usd.interface.parseLog(log)?.name === "CustodyAccountCreated";
      } catch { return false; }
    });
    
    if (event) {
      const parsedEvent = usd.interface.parseLog(event);
      DEPLOYED_ADDRESSES.TestCustodyAccountId = parsedEvent.args.accountId;
      console.log("✅ Test custody account created:", DEPLOYED_ADDRESSES.TestCustodyAccountId);
    }
    console.log("\n");

    // Step 6: Deposit test funds
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("💰 STEP 6: Depositing test funds...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    const testAmount = hre.ethers.parseUnits("1000000", 6); // $1,000,000 USD
    const depositTx = await usd.recordCustodyDeposit(
      DEPLOYED_ADDRESSES.TestCustodyAccountId,
      testAmount,
      { gasPrice: CONFIG.gasPrice }
    );
    await depositTx.wait();
    console.log("✅ Deposited $1,000,000 USD to test custody account");
    console.log("\n");

    // Save deployment info
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("💾 Saving deployment information...");
    console.log("═══════════════════════════════════════════════════════════════════════════════");

    const deploymentInfo = {
      network: "lemonchain-testnet",
      chainId: 1006,
      deployedAt: new Date().toISOString(),
      deployer: CONFIG.admin,
      contracts: DEPLOYED_ADDRESSES,
      explorerUrls: {
        USD: `https://testnet.explorer.lemonchain.io/address/${DEPLOYED_ADDRESSES.USD}`,
        LocksTreasuryLUSD: `https://testnet.explorer.lemonchain.io/address/${DEPLOYED_ADDRESSES.LocksTreasuryLUSD}`,
        LUSDMinting: `https://testnet.explorer.lemonchain.io/address/${DEPLOYED_ADDRESSES.LUSDMinting}`
      }
    };

    // Save to file
    const outputPath = path.join(__dirname, "testnet-deployment.json");
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Saved to:", outputPath);

    // Also save to src for frontend
    const frontendPath = path.join(__dirname, "../../../../src/contracts/testnet-addresses.json");
    const frontendDir = path.dirname(frontendPath);
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    fs.writeFileSync(frontendPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Saved to frontend:", frontendPath);
    console.log("\n");

    // Final summary
    console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                                                                              ║");
    console.log("║   ✅ DEPLOYMENT COMPLETE!                                                    ║");
    console.log("║                                                                              ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                              ║");
    console.log("║   📋 DEPLOYED CONTRACTS:                                                     ║");
    console.log("║                                                                              ║");
    console.log(`║   USD Token:          ${DEPLOYED_ADDRESSES.USD}   ║`);
    console.log(`║   LocksTreasuryLUSD:  ${DEPLOYED_ADDRESSES.LocksTreasuryLUSD}   ║`);
    console.log(`║   LUSDMinting:        ${DEPLOYED_ADDRESSES.LUSDMinting}   ║`);
    console.log("║                                                                              ║");
    console.log("║   🔗 Explorer: https://testnet.explorer.lemonchain.io                        ║");
    console.log("║                                                                              ║");
    console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
    console.log("\n");

    return deploymentInfo;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { main, CONFIG, DEPLOYED_ADDRESSES };

// Run if called directly
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
