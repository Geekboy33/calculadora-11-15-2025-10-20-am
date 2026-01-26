/**
 * DCB Treasury - Full Deployment Script for LemonChain
 * 
 * Deploys:
 * - USD Token (renamed from SimpleUSD)
 * - BankRegistry (renamed from SimpleBankRegistry)
 * - LockBox (renamed from SimpleLockBox)
 * - LUSD Token (renamed from SimpleLUSD)
 * - PriceOracle (NEW - USD/USDT price feed)
 * 
 * Configures:
 * - Role assignments for all wallets
 * - Oracle integration with USD and LUSD tokens
 * - Initial price feed setup
 * 
 * @author DCB Treasury Team
 * @version 2.0.0
 */

require('dotenv').config();
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const WALLETS_AND_ROLES = {
    deployerAdmin: { 
        address: "0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559", 
        roleName: "ADMIN",
        description: "Deployer & Admin - Full system control"
    },
    daesSigner: { 
        address: "0xCBA590Eec4E206e61Fb47A7fd4f04af76cE4202b", 
        roleName: "DAES_SIGNER",
        description: "DAES Signer - Multi-sig operations"
    },
    bankSigner: { 
        address: "0xF29F21Efce48AB3bf041c47Cc1fF2eBa289Ffc37", 
        roleName: "BANK_SIGNER",
        description: "Bank Signer - Bank operations"
    },
    issuerOperator: { 
        address: "0xC3C5F66A69d595826ec853f9E89cE1dD96D85c98", 
        roleName: "ISSUER_OPERATOR",
        description: "Issuer Operator - Mint/Burn operations"
    },
    approver: { 
        address: "0x765C1a2BF91c4802dAE034095cA0FF157631699d", 
        roleName: "APPROVER",
        description: "Approver - Transaction approvals"
    },
};

// Gas configuration for LemonChain
const GAS_CONFIG = {
    gasPrice: ethers.parseUnits("10", "gwei"),
    gasLimit: 8000000
};

async function main() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("  DCB Treasury - Full Deployment for LemonChain");
    console.log("  Version 2.0.0 - With Oracle Integration");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log();

    // ─────────────────────────────────────────────────────────────────────────────
    // NETWORK INFO
    // ─────────────────────────────────────────────────────────────────────────────
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    const [admin] = await ethers.getSigners();
    console.log(`👤 Admin wallet: ${admin.address}`);
    
    const balance = await ethers.provider.getBalance(admin.address);
    console.log(`💰 Admin balance: ${ethers.formatEther(balance)} LEMX`);
    
    if (balance < ethers.parseEther("0.5")) {
        console.error("❌ Insufficient balance for deployment. Need at least 0.5 LEMX");
        process.exit(1);
    }

    console.log(`\n⛽ Gas price: ${ethers.formatUnits(GAS_CONFIG.gasPrice, "gwei")} gwei`);
    console.log(`⛽ Gas limit: ${GAS_CONFIG.gasLimit.toLocaleString()}`);

    const deployedContracts = {};
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT PHASE
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│                           CONTRACT DEPLOYMENT                              │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Deploy USD Token
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1️⃣  Deploying USD Token...");
    try {
        const USD = await ethers.getContractFactory("USD");
        const usd = await USD.deploy(GAS_CONFIG);
        await usd.waitForDeployment();
        deployedContracts.usd = usd.target;
        console.log(`   ✅ USD deployed at: ${usd.target}`);
        console.log(`   📝 Tx: ${usd.deploymentTransaction().hash}`);
    } catch (error) {
        console.error(`   ❌ USD deployment failed: ${error.message}`);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Deploy BankRegistry
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2️⃣  Deploying BankRegistry...");
    try {
        const BankRegistry = await ethers.getContractFactory("BankRegistry");
        const bankRegistry = await BankRegistry.deploy(GAS_CONFIG);
        await bankRegistry.waitForDeployment();
        deployedContracts.bankRegistry = bankRegistry.target;
        console.log(`   ✅ BankRegistry deployed at: ${bankRegistry.target}`);
        console.log(`   📝 Tx: ${bankRegistry.deploymentTransaction().hash}`);
    } catch (error) {
        console.error(`   ❌ BankRegistry deployment failed: ${error.message}`);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Deploy LockBox
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3️⃣  Deploying LockBox...");
    try {
        const LockBox = await ethers.getContractFactory("LockBox");
        const lockBox = await LockBox.deploy(deployedContracts.usd, GAS_CONFIG);
        await lockBox.waitForDeployment();
        deployedContracts.lockBox = lockBox.target;
        console.log(`   ✅ LockBox deployed at: ${lockBox.target}`);
        console.log(`   📝 Tx: ${lockBox.deploymentTransaction().hash}`);
    } catch (error) {
        console.error(`   ❌ LockBox deployment failed: ${error.message}`);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Deploy LUSD Token
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4️⃣  Deploying LUSD Token...");
    try {
        const LUSD = await ethers.getContractFactory("LUSD");
        const lusd = await LUSD.deploy(admin.address, GAS_CONFIG);
        await lusd.waitForDeployment();
        deployedContracts.lusd = lusd.target;
        console.log(`   ✅ LUSD deployed at: ${lusd.target}`);
        console.log(`   📝 Tx: ${lusd.deploymentTransaction().hash}`);
    } catch (error) {
        console.error(`   ❌ LUSD deployment failed: ${error.message}`);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. Deploy PriceOracle
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n5️⃣  Deploying PriceOracle (USD/USDT)...");
    try {
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        const priceOracle = await PriceOracle.deploy(GAS_CONFIG);
        await priceOracle.waitForDeployment();
        deployedContracts.priceOracle = priceOracle.target;
        console.log(`   ✅ PriceOracle deployed at: ${priceOracle.target}`);
        console.log(`   📝 Tx: ${priceOracle.deploymentTransaction().hash}`);
    } catch (error) {
        console.error(`   ❌ PriceOracle deployment failed: ${error.message}`);
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONFIGURATION PHASE
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│                           ROLE CONFIGURATION                               │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");

    // Get contract instances
    const usd = await ethers.getContractAt("USD", deployedContracts.usd);
    const bankRegistry = await ethers.getContractAt("BankRegistry", deployedContracts.bankRegistry);
    const lockBox = await ethers.getContractAt("LockBox", deployedContracts.lockBox);
    const lusd = await ethers.getContractAt("LUSD", deployedContracts.lusd);
    const priceOracle = await ethers.getContractAt("PriceOracle", deployedContracts.priceOracle);

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Configure USD Token Roles
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n6️⃣  Configuring USD Token roles...");
    try {
        // Add Issuer Operator as minter
        let tx = await usd.addMinter(WALLETS_AND_ROLES.issuerOperator.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ USD Minter added: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        // Whitelist key addresses
        tx = await usd.setWhitelistBatch(
            [
                WALLETS_AND_ROLES.deployerAdmin.address,
                WALLETS_AND_ROLES.issuerOperator.address,
                deployedContracts.lockBox
            ],
            true,
            GAS_CONFIG
        );
        await tx.wait();
        console.log(`   ✅ USD Whitelist configured`);
    } catch (error) {
        console.error(`   ⚠️  USD role config warning: ${error.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 7. Configure BankRegistry Roles
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n7️⃣  Configuring BankRegistry roles...");
    try {
        // Add DAES Signer as approver
        let tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.daesSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ BankRegistry Approver added: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        // Add Bank Signer as approver
        tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.bankSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ BankRegistry Approver added: ${WALLETS_AND_ROLES.bankSigner.address}`);
        
        // Add Approver as approver
        tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.approver.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ BankRegistry Approver added: ${WALLETS_AND_ROLES.approver.address}`);
        
        // Set required approvals to 2
        tx = await bankRegistry.setRequiredApprovals(2, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ BankRegistry required approvals: 2`);
    } catch (error) {
        console.error(`   ⚠️  BankRegistry role config warning: ${error.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 8. Configure LockBox Roles
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n8️⃣  Configuring LockBox roles...");
    try {
        // Add DAES Signer as signer
        let tx = await lockBox.addSigner(WALLETS_AND_ROLES.daesSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LockBox Signer added: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        // Add Bank Signer as signer
        tx = await lockBox.addSigner(WALLETS_AND_ROLES.bankSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LockBox Signer added: ${WALLETS_AND_ROLES.bankSigner.address}`);
        
        // Add Approver as signer
        tx = await lockBox.addSigner(WALLETS_AND_ROLES.approver.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LockBox Signer added: ${WALLETS_AND_ROLES.approver.address}`);
        
        // Set required signatures to 2
        tx = await lockBox.setRequiredSignatures(2, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LockBox required signatures: 2`);
    } catch (error) {
        console.error(`   ⚠️  LockBox role config warning: ${error.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 9. Configure LUSD Token Roles
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n9️⃣  Configuring LUSD Token roles...");
    try {
        const MINTER_ROLE = await lusd.MINTER_ROLE();
        const BURNER_ROLE = await lusd.BURNER_ROLE();
        const OPERATOR_ROLE = await lusd.OPERATOR_ROLE();
        
        // Grant Issuer Operator minter role
        let tx = await lusd.grantRole(MINTER_ROLE, WALLETS_AND_ROLES.issuerOperator.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LUSD Minter: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        // Grant Issuer Operator burner role
        tx = await lusd.grantRole(BURNER_ROLE, WALLETS_AND_ROLES.issuerOperator.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LUSD Burner: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        // Grant DAES Signer operator role
        tx = await lusd.grantRole(OPERATOR_ROLE, WALLETS_AND_ROLES.daesSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LUSD Operator: ${WALLETS_AND_ROLES.daesSigner.address}`);
    } catch (error) {
        console.error(`   ⚠️  LUSD role config warning: ${error.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 10. Configure PriceOracle
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n🔟 Configuring PriceOracle...");
    try {
        // Add DAES Signer as price source
        let tx = await priceOracle.addPriceSource(WALLETS_AND_ROLES.daesSigner.address, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ PriceOracle source added: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        // Set initial price (1 USD = 1 USDT)
        tx = await priceOracle.updatePriceDirect(100000000, GAS_CONFIG); // $1.00 with 8 decimals
        await tx.wait();
        console.log(`   ✅ PriceOracle initial price: $1.00`);
    } catch (error) {
        console.error(`   ⚠️  PriceOracle config warning: ${error.message}`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 11. Link Oracle to Tokens
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1️⃣1️⃣ Linking PriceOracle to tokens...");
    try {
        // Set oracle on USD token
        let tx = await usd.setOracle(deployedContracts.priceOracle, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ USD Oracle set: ${deployedContracts.priceOracle}`);
        
        // Set oracle on LUSD token
        tx = await lusd.setOracle(deployedContracts.priceOracle, GAS_CONFIG);
        await tx.wait();
        console.log(`   ✅ LUSD Oracle set: ${deployedContracts.priceOracle}`);
    } catch (error) {
        console.error(`   ⚠️  Oracle linking warning: ${error.message}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│                           DEPLOYMENT COMPLETE                              │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");

    console.log("\n📋 Deployed Contracts:");
    console.log("─────────────────────────────────────────────────────────────────────────────");
    console.log(`   USD Token:      ${deployedContracts.usd}`);
    console.log(`   BankRegistry:   ${deployedContracts.bankRegistry}`);
    console.log(`   LockBox:        ${deployedContracts.lockBox}`);
    console.log(`   LUSD Token:     ${deployedContracts.lusd}`);
    console.log(`   PriceOracle:    ${deployedContracts.priceOracle}`);

    console.log("\n👥 Configured Roles:");
    console.log("─────────────────────────────────────────────────────────────────────────────");
    for (const [key, wallet] of Object.entries(WALLETS_AND_ROLES)) {
        console.log(`   ${wallet.roleName.padEnd(18)} ${wallet.address}`);
    }

    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
        version: "2.0.0",
        contracts: {
            usd: deployedContracts.usd,
            bankRegistry: deployedContracts.bankRegistry,
            lockBox: deployedContracts.lockBox,
            lusd: deployedContracts.lusd,
            priceOracle: deployedContracts.priceOracle
        },
        roles: {
            admin: WALLETS_AND_ROLES.deployerAdmin.address,
            daesSigner: WALLETS_AND_ROLES.daesSigner.address,
            bankSigner: WALLETS_AND_ROLES.bankSigner.address,
            issuerOperator: WALLETS_AND_ROLES.issuerOperator.address,
            approver: WALLETS_AND_ROLES.approver.address
        },
        configuration: {
            bankRegistryRequiredApprovals: 2,
            lockBoxRequiredSignatures: 2,
            oracleInitialPrice: "1.00 USD/USDT",
            oracleDecimals: 8
        }
    };

    const deploymentPath = path.join(__dirname, '..', 'dcb-treasury-deployment-v2.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    // Final balance check
    const finalBalance = await ethers.provider.getBalance(admin.address);
    const gasUsed = balance - finalBalance;
    console.log(`\n⛽ Total gas used: ${ethers.formatEther(gasUsed)} LEMX`);
    console.log(`💰 Final balance: ${ethers.formatEther(finalBalance)} LEMX`);

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log("  ✅ DCB Treasury deployment completed successfully!");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
