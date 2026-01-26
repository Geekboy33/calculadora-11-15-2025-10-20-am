// DCB Treasury - Simplified Deployment for LemonChain
const { ethers } = require("ethers");
const fs = require('fs');
const path = require('path');

// LemonChain Configuration
const LEMON_RPC = "https://rpc.lemonchain.io";

// Admin wallet
const ADMIN_KEY = "1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080";

// Authorized Wallets
const WALLETS = {
  admin: "0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559",
  daesSigner: "0xCBA590Eec4E206e61Fb47A7fd4f04af76cE4202b",
  bankSigner: "0xF29F21Efce48AB3bf041c47Cc1fF2eBa289Ffc37",
  issuerOperator: "0xC3C5F66A69d595826ec853f9E89cE1dD96D85c98",
  approver: "0x765C1a2BF91c4802dAE034095cA0FF157631699d"
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DCB Treasury - Simplified Deployment for LemonChain");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  
  // Connect to LemonChain
  const provider = new ethers.JsonRpcProvider(LEMON_RPC);
  const network = await provider.getNetwork();
  console.log(`✓ Connected to LemonChain (Chain ID: ${network.chainId})`);
  
  // Setup admin wallet
  const adminWallet = new ethers.Wallet(ADMIN_KEY, provider);
  console.log(`✓ Admin wallet: ${adminWallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(adminWallet.address);
  console.log(`✓ Admin balance: ${ethers.formatEther(balance)} LEMX`);
  
  if (balance === 0n) {
    console.log("");
    console.log("⚠️  Admin wallet has no LEMX for gas fees!");
    console.log(`   Please fund: ${WALLETS.admin}`);
    return;
  }
  
  // Load artifacts
  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'DCBTreasury');
  
  const loadArtifact = (name) => {
    const filePath = path.join(artifactsPath, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Artifact not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };
  
  console.log("");
  console.log("Starting deployment...");
  console.log("");
  
  const deployedContracts = {};
  
  try {
    // Get gas price from network
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("1", "gwei");
    console.log(`   Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    
    // 1. Deploy SimpleUSD
    console.log("1. Deploying SimpleUSD...");
    const usdArtifact = loadArtifact('SimpleUSD');
    const USDFactory = new ethers.ContractFactory(usdArtifact.abi, usdArtifact.bytecode, adminWallet);
    const usdTx = await USDFactory.deploy({ gasPrice });
    console.log(`   Tx hash: ${usdTx.deploymentTransaction().hash}`);
    const usd = await usdTx.waitForDeployment();
    deployedContracts.usd = await usd.getAddress();
    console.log(`   ✓ SimpleUSD deployed at: ${deployedContracts.usd}`);
    
    // 2. Deploy SimpleBankRegistry
    console.log("2. Deploying SimpleBankRegistry...");
    const bankArtifact = loadArtifact('SimpleBankRegistry');
    const BankFactory = new ethers.ContractFactory(bankArtifact.abi, bankArtifact.bytecode, adminWallet);
    const bankTx = await BankFactory.deploy({ gasPrice });
    console.log(`   Tx hash: ${bankTx.deploymentTransaction().hash}`);
    const bank = await bankTx.waitForDeployment();
    deployedContracts.bankRegistry = await bank.getAddress();
    console.log(`   ✓ SimpleBankRegistry deployed at: ${deployedContracts.bankRegistry}`);
    
    // 3. Deploy SimpleLockBox
    console.log("3. Deploying SimpleLockBox...");
    const lockArtifact = loadArtifact('SimpleLockBox');
    const LockFactory = new ethers.ContractFactory(lockArtifact.abi, lockArtifact.bytecode, adminWallet);
    const lockTx = await LockFactory.deploy({ gasPrice });
    console.log(`   Tx hash: ${lockTx.deploymentTransaction().hash}`);
    const lockBox = await lockTx.waitForDeployment();
    deployedContracts.lockBox = await lockBox.getAddress();
    console.log(`   ✓ SimpleLockBox deployed at: ${deployedContracts.lockBox}`);
    
    // 4. Deploy SimpleLUSD
    console.log("4. Deploying SimpleLUSD...");
    const lusdArtifact = loadArtifact('SimpleLUSD');
    const LUSDFactory = new ethers.ContractFactory(lusdArtifact.abi, lusdArtifact.bytecode, adminWallet);
    const lusdTx = await LUSDFactory.deploy({ gasPrice });
    console.log(`   Tx hash: ${lusdTx.deploymentTransaction().hash}`);
    const lusd = await lusdTx.waitForDeployment();
    deployedContracts.lusd = await lusd.getAddress();
    console.log(`   ✓ SimpleLUSD deployed at: ${deployedContracts.lusd}`);
    
    // 5. Configure roles
    console.log("");
    console.log("5. Configuring roles...");
    
    // Configure LockBox roles
    let tx = await lockBox.setBankSigner(WALLETS.bankSigner, true, { gasPrice });
    await tx.wait();
    console.log(`   ✓ Bank Signer: ${WALLETS.bankSigner}`);
    
    tx = await lockBox.setDaesSigner(WALLETS.daesSigner, true, { gasPrice });
    await tx.wait();
    console.log(`   ✓ DAES Signer: ${WALLETS.daesSigner}`);
    
    tx = await lockBox.setApprover(WALLETS.approver, true, { gasPrice });
    await tx.wait();
    console.log(`   ✓ Approver: ${WALLETS.approver}`);
    
    tx = await lockBox.setIssuer(WALLETS.issuerOperator, true, { gasPrice });
    await tx.wait();
    console.log(`   ✓ Issuer: ${WALLETS.issuerOperator}`);
    
    // Configure LUSD minter
    tx = await lusd.addMinter(WALLETS.issuerOperator, { gasPrice });
    await tx.wait();
    console.log(`   ✓ LUSD Minter: ${WALLETS.issuerOperator}`);
    
    // Configure USD minter
    tx = await usd.addMinter(WALLETS.issuerOperator, { gasPrice });
    await tx.wait();
    console.log(`   ✓ USD Minter: ${WALLETS.issuerOperator}`);
    
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("  DEPLOYMENT COMPLETE!");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Contract Addresses:");
    console.log("─────────────────────────────────────────────────────────────────");
    console.log(`USD Token:          ${deployedContracts.usd}`);
    console.log(`Bank Registry:      ${deployedContracts.bankRegistry}`);
    console.log(`Lock Box:           ${deployedContracts.lockBox}`);
    console.log(`LUSD Token:         ${deployedContracts.lusd}`);
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("");
    
    // Save deployment info
    const deploymentInfo = {
      network: "LemonChain",
      chainId: 1006,
      deployedAt: new Date().toISOString(),
      contracts: deployedContracts,
      roles: WALLETS
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'dcb-treasury-deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("✓ Deployment info saved to dcb-treasury-deployment.json");
    
  } catch (error) {
    console.error("");
    console.error("❌ Deployment failed:", error.message);
    console.error("");
    console.error("Full error:", error);
  }
}

main().catch(console.error);
