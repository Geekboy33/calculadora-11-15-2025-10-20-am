/**
 * DCB Treasury - Full Deployment Script for LemonChain
 * Version 2.0.0 - With Oracle Integration
 * Uses ethers.js directly with Hardhat 3 artifacts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const LEMON_CHAIN_RPC = "https://rpc.lemonchain.io";
const ADMIN_PRIVATE_KEY = "1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080";

const WALLETS_AND_ROLES = {
    deployerAdmin: { 
        address: "0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559", 
        roleName: "ADMIN"
    },
    daesSigner: { 
        address: "0xCBA590Eec4E206e61Fb47A7fd4f04af76cE4202b", 
        roleName: "DAES_SIGNER"
    },
    bankSigner: { 
        address: "0xF29F21Efce48AB3bf041c47Cc1fF2eBa289Ffc37", 
        roleName: "BANK_SIGNER"
    },
    issuerOperator: { 
        address: "0xC3C5F66A69d595826ec853f9E89cE1dD96D85c98", 
        roleName: "ISSUER_OPERATOR"
    },
    approver: { 
        address: "0x765C1a2BF91c4802dAE034095cA0FF157631699d", 
        roleName: "APPROVER"
    },
};

// Helper to load contract artifact
function loadArtifact(contractName) {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'DCBTreasury', `${contractName}.sol`, `${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact;
}

async function deployContract(wallet, contractName, args = []) {
    const artifact = loadArtifact(contractName);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy(...args, {
        gasPrice: ethers.parseUnits("10", "gwei"),
        gasLimit: 8000000n
    });
    await contract.waitForDeployment();
    return contract;
}

async function main() {
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log("  DCB Treasury - Full Deployment for LemonChain");
    console.log("  Version 2.0.0 - With Oracle Integration");
    console.log("═══════════════════════════════════════════════════════════════════════════════");
    console.log();

    // ─────────────────────────────────────────────────────────────────────────────
    // SETUP PROVIDER AND WALLET
    // ─────────────────────────────────────────────────────────────────────────────
    const provider = new ethers.JsonRpcProvider(LEMON_CHAIN_RPC);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    
    const network = await provider.getNetwork();
    console.log(`📡 Network: LemonChain (Chain ID: ${network.chainId})`);
    console.log(`👤 Admin wallet: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Admin balance: ${ethers.formatEther(balance)} LEMX`);
    
    if (balance < ethers.parseEther("0.5")) {
        console.error("❌ Insufficient balance for deployment. Need at least 0.5 LEMX");
        process.exit(1);
    }

    const txOptions = {
        gasPrice: ethers.parseUnits("10", "gwei"),
        gasLimit: 8000000n
    };

    console.log(`\n⛽ Gas price: ${ethers.formatUnits(txOptions.gasPrice, "gwei")} gwei`);

    const deployedContracts = {};
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT PHASE
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("\n┌─────────────────────────────────────────────────────────────────────────────┐");
    console.log("│                           CONTRACT DEPLOYMENT                              │");
    console.log("└─────────────────────────────────────────────────────────────────────────────┘");

    // 1. Deploy USD Token
    console.log("\n1️⃣  Deploying USD Token...");
    try {
        const usd = await deployContract(wallet, "USD");
        deployedContracts.usd = await usd.getAddress();
        console.log(`   ✅ USD deployed at: ${deployedContracts.usd}`);
    } catch (error) {
        console.error(`   ❌ USD deployment failed: ${error.message}`);
        process.exit(1);
    }

    // 2. Deploy BankRegistry
    console.log("\n2️⃣  Deploying BankRegistry...");
    try {
        const bankRegistry = await deployContract(wallet, "BankRegistry");
        deployedContracts.bankRegistry = await bankRegistry.getAddress();
        console.log(`   ✅ BankRegistry deployed at: ${deployedContracts.bankRegistry}`);
    } catch (error) {
        console.error(`   ❌ BankRegistry deployment failed: ${error.message}`);
        process.exit(1);
    }

    // 3. Deploy LockBox
    console.log("\n3️⃣  Deploying LockBox...");
    try {
        const lockBox = await deployContract(wallet, "LockBox", [deployedContracts.usd]);
        deployedContracts.lockBox = await lockBox.getAddress();
        console.log(`   ✅ LockBox deployed at: ${deployedContracts.lockBox}`);
    } catch (error) {
        console.error(`   ❌ LockBox deployment failed: ${error.message}`);
        process.exit(1);
    }

    // 4. Deploy LUSD Token
    console.log("\n4️⃣  Deploying LUSD Token...");
    try {
        const lusd = await deployContract(wallet, "LUSD", [wallet.address]);
        deployedContracts.lusd = await lusd.getAddress();
        console.log(`   ✅ LUSD deployed at: ${deployedContracts.lusd}`);
    } catch (error) {
        console.error(`   ❌ LUSD deployment failed: ${error.message}`);
        process.exit(1);
    }

    // 5. Deploy PriceOracle
    console.log("\n5️⃣  Deploying PriceOracle (USD/USDT)...");
    try {
        const priceOracle = await deployContract(wallet, "PriceOracle");
        deployedContracts.priceOracle = await priceOracle.getAddress();
        console.log(`   ✅ PriceOracle deployed at: ${deployedContracts.priceOracle}`);
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
    const usdArtifact = loadArtifact("USD");
    const bankRegistryArtifact = loadArtifact("BankRegistry");
    const lockBoxArtifact = loadArtifact("LockBox");
    const lusdArtifact = loadArtifact("LUSD");
    const priceOracleArtifact = loadArtifact("PriceOracle");

    const usd = new ethers.Contract(deployedContracts.usd, usdArtifact.abi, wallet);
    const bankRegistry = new ethers.Contract(deployedContracts.bankRegistry, bankRegistryArtifact.abi, wallet);
    const lockBox = new ethers.Contract(deployedContracts.lockBox, lockBoxArtifact.abi, wallet);
    const lusd = new ethers.Contract(deployedContracts.lusd, lusdArtifact.abi, wallet);
    const priceOracle = new ethers.Contract(deployedContracts.priceOracle, priceOracleArtifact.abi, wallet);

    // 6. Configure USD Token Roles
    console.log("\n6️⃣  Configuring USD Token roles...");
    try {
        let tx = await usd.addMinter(WALLETS_AND_ROLES.issuerOperator.address, txOptions);
        await tx.wait();
        console.log(`   ✅ USD Minter added: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        tx = await usd.setWhitelistBatch(
            [WALLETS_AND_ROLES.deployerAdmin.address, WALLETS_AND_ROLES.issuerOperator.address, deployedContracts.lockBox],
            true,
            txOptions
        );
        await tx.wait();
        console.log(`   ✅ USD Whitelist configured`);
    } catch (error) {
        console.error(`   ⚠️  USD role config: ${error.message}`);
    }

    // 7. Configure BankRegistry Roles
    console.log("\n7️⃣  Configuring BankRegistry roles...");
    try {
        let tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.daesSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Approver: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.bankSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Approver: ${WALLETS_AND_ROLES.bankSigner.address}`);
        
        tx = await bankRegistry.addApprover(WALLETS_AND_ROLES.approver.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Approver: ${WALLETS_AND_ROLES.approver.address}`);
        
        tx = await bankRegistry.setRequiredApprovals(2, txOptions);
        await tx.wait();
        console.log(`   ✅ Required approvals: 2`);
    } catch (error) {
        console.error(`   ⚠️  BankRegistry config: ${error.message}`);
    }

    // 8. Configure LockBox Roles
    console.log("\n8️⃣  Configuring LockBox roles...");
    try {
        let tx = await lockBox.addSigner(WALLETS_AND_ROLES.daesSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Signer: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        tx = await lockBox.addSigner(WALLETS_AND_ROLES.bankSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Signer: ${WALLETS_AND_ROLES.bankSigner.address}`);
        
        tx = await lockBox.addSigner(WALLETS_AND_ROLES.approver.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Signer: ${WALLETS_AND_ROLES.approver.address}`);
        
        tx = await lockBox.setRequiredSignatures(2, txOptions);
        await tx.wait();
        console.log(`   ✅ Required signatures: 2`);
    } catch (error) {
        console.error(`   ⚠️  LockBox config: ${error.message}`);
    }

    // 9. Configure LUSD Token Roles
    console.log("\n9️⃣  Configuring LUSD Token roles...");
    try {
        const MINTER_ROLE = await lusd.MINTER_ROLE();
        const BURNER_ROLE = await lusd.BURNER_ROLE();
        const OPERATOR_ROLE = await lusd.OPERATOR_ROLE();
        
        let tx = await lusd.grantRole(MINTER_ROLE, WALLETS_AND_ROLES.issuerOperator.address, txOptions);
        await tx.wait();
        console.log(`   ✅ LUSD Minter: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        tx = await lusd.grantRole(BURNER_ROLE, WALLETS_AND_ROLES.issuerOperator.address, txOptions);
        await tx.wait();
        console.log(`   ✅ LUSD Burner: ${WALLETS_AND_ROLES.issuerOperator.address}`);
        
        tx = await lusd.grantRole(OPERATOR_ROLE, WALLETS_AND_ROLES.daesSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ LUSD Operator: ${WALLETS_AND_ROLES.daesSigner.address}`);
    } catch (error) {
        console.error(`   ⚠️  LUSD config: ${error.message}`);
    }

    // 10. Configure PriceOracle
    console.log("\n🔟 Configuring PriceOracle...");
    try {
        let tx = await priceOracle.addPriceSource(WALLETS_AND_ROLES.daesSigner.address, txOptions);
        await tx.wait();
        console.log(`   ✅ Price source: ${WALLETS_AND_ROLES.daesSigner.address}`);
        
        tx = await priceOracle.updatePriceDirect(100000000, txOptions);
        await tx.wait();
        console.log(`   ✅ Initial price: $1.00 USD/USDT`);
    } catch (error) {
        console.error(`   ⚠️  PriceOracle config: ${error.message}`);
    }

    // 11. Link Oracle to Tokens
    console.log("\n1️⃣1️⃣ Linking PriceOracle to tokens...");
    try {
        let tx = await usd.setOracle(deployedContracts.priceOracle, txOptions);
        await tx.wait();
        console.log(`   ✅ USD Oracle linked`);
        
        tx = await lusd.setOracle(deployedContracts.priceOracle, txOptions);
        await tx.wait();
        console.log(`   ✅ LUSD Oracle linked`);
    } catch (error) {
        console.error(`   ⚠️  Oracle linking: ${error.message}`);
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

    // Save deployment info
    const deploymentInfo = {
        network: "LemonChain",
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
        version: "2.0.0",
        contracts: deployedContracts,
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
    console.log(`\n💾 Deployment saved to: ${deploymentPath}`);

    const finalBalance = await provider.getBalance(wallet.address);
    console.log(`\n⛽ Gas used: ${ethers.formatEther(balance - finalBalance)} LEMX`);

    console.log("\n═══════════════════════════════════════════════════════════════════════════════");
    console.log("  ✅ DCB Treasury v2.0 deployment completed!");
    console.log("═══════════════════════════════════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
