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
 * ║  3. PostQuantumSignatureVerifier                                                                 ║
 * ║  4. DCBTimelock                                                                                  ║
 * ║  5. USD (Main Contract)                                                                          ║
 * ║  6. LocksTreasuryLUSD                                                                            ║
 * ║  7. LUSDMinting                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const CONFIG = {
    // Testnet settings
    network: "lemonchain-testnet",
    chainId: 1006, // LemonChain Testnet
    
    // Admin address (will be deployer)
    adminAddress: null, // Set during deployment
    
    // Initial settings
    votingPeriod: 3 * 24 * 60 * 60, // 3 days in seconds
    votingDelay: 1 * 24 * 60 * 60,  // 1 day in seconds
    timelockDelay: 24 * 60 * 60,    // 24 hours
    
    // Output file for deployed addresses
    outputFile: "./deployments/testnet-addresses.json"
};

// Deployed addresses storage
const deployedContracts = {
    network: CONFIG.network,
    chainId: CONFIG.chainId,
    deployedAt: new Date().toISOString(),
    contracts: {}
};

async function main() {
    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  🚀 DCB TREASURY - TESTNET DEPLOYMENT                            ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝\n");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    CONFIG.adminAddress = deployer.address;
    
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "LEMON\n");

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    if (balance < ethers.parseEther("0.1")) {
        console.error("❌ Insufficient balance for deployment. Need at least 0.1 LEMON");
        process.exit(1);
    }

    try {
        // 1. Deploy Price Oracle Aggregator
        console.log("1️⃣  Deploying PriceOracleAggregator...");
        const PriceOracle = await ethers.getContractFactory("PriceOracleAggregator");
        const priceOracle = await PriceOracle.deploy(
            deployer.address,  // admin
            ethers.ZeroAddress // No Chainlink on testnet, will use manual
        );
        await priceOracle.waitForDeployment();
        const priceOracleAddress = await priceOracle.getAddress();
        console.log("   ✅ PriceOracleAggregator:", priceOracleAddress);
        deployedContracts.contracts.PriceOracleAggregator = priceOracleAddress;

        // 2. Deploy KYC Compliance Registry
        console.log("\n2️⃣  Deploying KYCComplianceRegistry...");
        const KYCRegistry = await ethers.getContractFactory("KYCComplianceRegistry");
        const kycRegistry = await KYCRegistry.deploy(deployer.address);
        await kycRegistry.waitForDeployment();
        const kycRegistryAddress = await kycRegistry.getAddress();
        console.log("   ✅ KYCComplianceRegistry:", kycRegistryAddress);
        deployedContracts.contracts.KYCComplianceRegistry = kycRegistryAddress;

        // 3. Deploy Post-Quantum Signature Verifier
        console.log("\n3️⃣  Deploying PostQuantumSignatureVerifier...");
        const PQCVerifier = await ethers.getContractFactory("PostQuantumSignatureVerifier");
        const pqcVerifier = await PQCVerifier.deploy(deployer.address);
        await pqcVerifier.waitForDeployment();
        const pqcVerifierAddress = await pqcVerifier.getAddress();
        console.log("   ✅ PostQuantumSignatureVerifier:", pqcVerifierAddress);
        deployedContracts.contracts.PostQuantumSignatureVerifier = pqcVerifierAddress;

        // 4. Deploy Timelock
        console.log("\n4️⃣  Deploying DCBTimelock...");
        const Timelock = await ethers.getContractFactory("DCBTimelock");
        const timelock = await Timelock.deploy(
            deployer.address,           // admin
            [deployer.address],         // proposers
            [deployer.address],         // executors
            CONFIG.timelockDelay        // delay
        );
        await timelock.waitForDeployment();
        const timelockAddress = await timelock.getAddress();
        console.log("   ✅ DCBTimelock:", timelockAddress);
        deployedContracts.contracts.DCBTimelock = timelockAddress;

        // 5. Deploy USD Contract (Main)
        console.log("\n5️⃣  Deploying USD Contract...");
        const USD = await ethers.getContractFactory("USD");
        const usd = await USD.deploy(deployer.address);
        await usd.waitForDeployment();
        const usdAddress = await usd.getAddress();
        console.log("   ✅ USD:", usdAddress);
        deployedContracts.contracts.USD = usdAddress;

        // 6. Deploy LocksTreasuryLUSD
        console.log("\n6️⃣  Deploying LocksTreasuryLUSD...");
        const LocksTreasury = await ethers.getContractFactory("LocksTreasuryLUSD");
        const locksTreasury = await LocksTreasury.deploy(
            deployer.address,  // admin
            usdAddress         // USD contract
        );
        await locksTreasury.waitForDeployment();
        const locksTreasuryAddress = await locksTreasury.getAddress();
        console.log("   ✅ LocksTreasuryLUSD:", locksTreasuryAddress);
        deployedContracts.contracts.LocksTreasuryLUSD = locksTreasuryAddress;

        // 7. Deploy LUSDMinting
        console.log("\n7️⃣  Deploying LUSDMinting...");
        const LUSDMinting = await ethers.getContractFactory("LUSDMinting");
        const lusdMinting = await LUSDMinting.deploy(
            deployer.address,      // admin
            usdAddress,            // USD contract
            locksTreasuryAddress   // LocksTreasury contract
        );
        await lusdMinting.waitForDeployment();
        const lusdMintingAddress = await lusdMinting.getAddress();
        console.log("   ✅ LUSDMinting:", lusdMintingAddress);
        deployedContracts.contracts.LUSDMinting = lusdMintingAddress;

        // 8. Configure contracts
        console.log("\n8️⃣  Configuring contracts...");
        
        // Link USD to LocksTreasury
        console.log("   📎 Linking USD → LocksTreasuryLUSD...");
        await usd.setLocksTreasuryLUSD(locksTreasuryAddress);
        
        // Link LocksTreasury to LUSDMinting
        console.log("   📎 Linking LocksTreasuryLUSD → LUSDMinting...");
        await locksTreasury.setLUSDMintingContract(lusdMintingAddress);
        
        // Set up manual price oracle for testnet
        console.log("   📎 Setting up manual price oracle...");
        await priceOracle.addManualOracle("MANUAL_USD", 100); // 100% weight
        
        // Whitelist deployer for testing
        console.log("   📎 Whitelisting deployer for testing...");
        await kycRegistry.addToWhitelist(deployer.address);

        console.log("   ✅ All configurations complete!");

        // Save deployed addresses
        console.log("\n9️⃣  Saving deployment info...");
        const outputDir = path.dirname(CONFIG.outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(
            CONFIG.outputFile,
            JSON.stringify(deployedContracts, null, 2)
        );
        console.log("   ✅ Saved to:", CONFIG.outputFile);

        // Summary
        console.log("\n╔══════════════════════════════════════════════════════════════════╗");
        console.log("║  ✅ DEPLOYMENT COMPLETE                                          ║");
        console.log("╚══════════════════════════════════════════════════════════════════╝\n");
        
        console.log("📋 DEPLOYED CONTRACTS:\n");
        console.log("┌─────────────────────────────────┬──────────────────────────────────────────────┐");
        console.log("│ Contract                        │ Address                                      │");
        console.log("├─────────────────────────────────┼──────────────────────────────────────────────┤");
        for (const [name, address] of Object.entries(deployedContracts.contracts)) {
            console.log(`│ ${name.padEnd(31)} │ ${address} │`);
        }
        console.log("└─────────────────────────────────┴──────────────────────────────────────────────┘");
        
        console.log("\n🔗 NEXT STEPS:");
        console.log("   1. Copy addresses to frontend configuration");
        console.log("   2. Test creating a custody account");
        console.log("   3. Test USD injection flow");
        console.log("   4. Test lock acceptance in LEMX");
        console.log("   5. Test LUSD minting\n");

        return deployedContracts;

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
