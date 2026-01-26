// DCB Treasury Certification Platform - Deployment Script for LemonChain
const { ethers } = require("ethers");

// LemonChain Configuration
const LEMON_RPC = "https://rpc.lemonchain.io";
const CHAIN_ID = 1006;

// Authorized Wallets
const WALLETS = {
  admin: {
    address: "0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559",
    privateKey: "1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080"
  },
  daesSigner: {
    address: "0xCBA590Eec4E206e61Fb47A7fd4f04af76cE4202b",
    privateKey: "3ed4c204d5ec97584b5c5dc960f8272ade6bd6aacfe5593eddc8500dff2a1538"
  },
  bankSigner: {
    address: "0xF29F21Efce48AB3bf041c47Cc1fF2eBa289Ffc37",
    privateKey: "884fb9175526f3a6cd85d71a0e11f354056e2ccb226bdfd8e37a0a750a478dc2"
  },
  issuerOperator: {
    address: "0xC3C5F66A69d595826ec853f9E89cE1dD96D85c98",
    privateKey: "4dc69a4c20e7598f3192ea97ab08a1ac925d547ebfba72b918b333c972903706"
  },
  approver: {
    address: "0x765C1a2BF91c4802dAE034095cA0FF157631699d",
    privateKey: "ec53a11347c7b0b366d09db901f2fd8f978633db25648cf8e1757e5fad755d0b"
  }
};

// Contract ABIs (simplified for deployment)
const USD_ABI = [
  "constructor()",
  "function grantRole(bytes32 role, address account)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function setWhitelist(address account, bool status)"
];

const BANK_REGISTRY_ABI = [
  "constructor()",
  "function grantRole(bytes32 role, address account)",
  "function REGISTRAR_ROLE() view returns (bytes32)",
  "function APPROVER_ROLE() view returns (bytes32)"
];

const CUSTODY_FACTORY_ABI = [
  "constructor(address _usdToken, address _bankRegistry)",
  "function grantRole(bytes32 role, address account)",
  "function FACTORY_ROLE() view returns (bytes32)"
];

const LOCKBOX_ABI = [
  "constructor()",
  "function grantRole(bytes32 role, address account)",
  "function BANK_SIGNER_ROLE() view returns (bytes32)",
  "function DAES_SIGNER_ROLE() view returns (bytes32)",
  "function ISSUER_ROLE() view returns (bytes32)",
  "function APPROVER_ROLE() view returns (bytes32)"
];

const LUSD_ABI = [
  "constructor()",
  "function grantRole(bytes32 role, address account)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function setIssuerController(address _controller)"
];

const ISSUER_CONTROLLER_ABI = [
  "constructor(address _lockBox, address _lusd)",
  "function grantRole(bytes32 role, address account)",
  "function ISSUER_OPERATOR_ROLE() view returns (bytes32)",
  "function setReserveVault(address _vault)"
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DCB Treasury Certification Platform - LemonChain Deployment");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  
  // Connect to LemonChain
  const provider = new ethers.JsonRpcProvider(LEMON_RPC);
  const network = await provider.getNetwork();
  console.log(`✓ Connected to LemonChain (Chain ID: ${network.chainId})`);
  
  // Setup admin wallet
  const adminWallet = new ethers.Wallet(WALLETS.admin.privateKey, provider);
  console.log(`✓ Admin wallet: ${adminWallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(adminWallet.address);
  console.log(`✓ Admin balance: ${ethers.formatEther(balance)} LEMX`);
  
  if (balance === 0n) {
    console.log("");
    console.log("⚠️  WARNING: Admin wallet has no LEMX for gas fees!");
    console.log("   Please fund the admin wallet before deploying:");
    console.log(`   ${WALLETS.admin.address}`);
    console.log("");
    return;
  }
  
  console.log("");
  console.log("Starting deployment...");
  console.log("");
  
  // Get contract bytecodes from artifacts
  const fs = require('fs');
  const path = require('path');
  
  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'DCBTreasury');
  
  // Load artifacts
  const loadArtifact = (name) => {
    const filePath = path.join(artifactsPath, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Artifact not found: ${filePath}. Please compile contracts first with: npx hardhat compile`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };
  
  // Gas settings for LemonChain
  const gasSettings = {
    gasLimit: 8000000n,
    gasPrice: ethers.parseUnits("20", "gwei")
  };
  
  try {
    // 1. Deploy USD Token
    console.log("1. Deploying USD Token...");
    const usdArtifact = loadArtifact('USD');
    const USDFactory = new ethers.ContractFactory(usdArtifact.abi, usdArtifact.bytecode, adminWallet);
    const usd = await USDFactory.deploy(gasSettings);
    await usd.waitForDeployment();
    const usdAddress = await usd.getAddress();
    console.log(`   ✓ USD Token deployed at: ${usdAddress}`);
    
    // 2. Deploy Bank Registry
    console.log("2. Deploying Bank Registry...");
    const bankRegistryArtifact = loadArtifact('BankRegistry');
    const BankRegistryFactory = new ethers.ContractFactory(bankRegistryArtifact.abi, bankRegistryArtifact.bytecode, adminWallet);
    const bankRegistry = await BankRegistryFactory.deploy(gasSettings);
    await bankRegistry.waitForDeployment();
    const bankRegistryAddress = await bankRegistry.getAddress();
    console.log(`   ✓ Bank Registry deployed at: ${bankRegistryAddress}`);
    
    // 3. Deploy Custody Factory
    console.log("3. Deploying Custody Factory...");
    const custodyFactoryArtifact = loadArtifact('CustodyFactory');
    const CustodyFactoryFactory = new ethers.ContractFactory(custodyFactoryArtifact.abi, custodyFactoryArtifact.bytecode, adminWallet);
    const custodyFactory = await CustodyFactoryFactory.deploy(usdAddress, bankRegistryAddress, gasSettings);
    await custodyFactory.waitForDeployment();
    const custodyFactoryAddress = await custodyFactory.getAddress();
    console.log(`   ✓ Custody Factory deployed at: ${custodyFactoryAddress}`);
    
    // 4. Deploy LockBox
    console.log("4. Deploying USD LockBox...");
    const lockBoxArtifact = loadArtifact('USDLockBox');
    const LockBoxFactory = new ethers.ContractFactory(lockBoxArtifact.abi, lockBoxArtifact.bytecode, adminWallet);
    const lockBox = await LockBoxFactory.deploy(gasSettings);
    await lockBox.waitForDeployment();
    const lockBoxAddress = await lockBox.getAddress();
    console.log(`   ✓ USD LockBox deployed at: ${lockBoxAddress}`);
    
    // 5. Deploy LUSD
    console.log("5. Deploying LUSD Token...");
    const lusdArtifact = loadArtifact('LUSD');
    const LUSDFactory = new ethers.ContractFactory(lusdArtifact.abi, lusdArtifact.bytecode, adminWallet);
    const lusd = await LUSDFactory.deploy(gasSettings);
    await lusd.waitForDeployment();
    const lusdAddress = await lusd.getAddress();
    console.log(`   ✓ LUSD Token deployed at: ${lusdAddress}`);
    
    // 6. Deploy Issuer Controller
    console.log("6. Deploying Issuer Controller...");
    const issuerControllerArtifact = loadArtifact('IssuerController');
    const IssuerControllerFactory = new ethers.ContractFactory(issuerControllerArtifact.abi, issuerControllerArtifact.bytecode, adminWallet);
    const issuerController = await IssuerControllerFactory.deploy(lockBoxAddress, lusdAddress, gasSettings);
    await issuerController.waitForDeployment();
    const issuerControllerAddress = await issuerController.getAddress();
    console.log(`   ✓ Issuer Controller deployed at: ${issuerControllerAddress}`);
    
    // 7. Configure roles
    console.log("");
    console.log("7. Configuring roles...");
    
    // Grant roles on LockBox
    const BANK_SIGNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BANK_SIGNER_ROLE"));
    const DAES_SIGNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DAES_SIGNER_ROLE"));
    const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
    const APPROVER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("APPROVER_ROLE"));
    
    const txGas = { gasLimit: 100000n, gasPrice: ethers.parseUnits("10", "gwei") };
    
    let tx = await lockBox.grantRole(BANK_SIGNER_ROLE, WALLETS.bankSigner.address, txGas);
    await tx.wait();
    console.log(`   ✓ Bank Signer role granted to ${WALLETS.bankSigner.address}`);
    
    tx = await lockBox.grantRole(DAES_SIGNER_ROLE, WALLETS.daesSigner.address, txGas);
    await tx.wait();
    console.log(`   ✓ DAES Signer role granted to ${WALLETS.daesSigner.address}`);
    
    tx = await lockBox.grantRole(ISSUER_ROLE, issuerControllerAddress, txGas);
    await tx.wait();
    console.log(`   ✓ Issuer role granted to IssuerController`);
    
    tx = await lockBox.grantRole(APPROVER_ROLE, WALLETS.approver.address, txGas);
    await tx.wait();
    console.log(`   ✓ Approver role granted to ${WALLETS.approver.address}`);
    
    // Configure LUSD
    tx = await lusd.setIssuerController(issuerControllerAddress, txGas);
    await tx.wait();
    console.log(`   ✓ LUSD IssuerController configured`);
    
    // Grant Issuer Operator role
    const ISSUER_OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_OPERATOR_ROLE"));
    tx = await issuerController.grantRole(ISSUER_OPERATOR_ROLE, WALLETS.issuerOperator.address, txGas);
    await tx.wait();
    console.log(`   ✓ Issuer Operator role granted to ${WALLETS.issuerOperator.address}`);
    
    console.log("");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("  DEPLOYMENT COMPLETE!");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Contract Addresses:");
    console.log("─────────────────────────────────────────────────────────────────");
    console.log(`USD Token:          ${usdAddress}`);
    console.log(`Bank Registry:      ${bankRegistryAddress}`);
    console.log(`Custody Factory:    ${custodyFactoryAddress}`);
    console.log(`USD LockBox:        ${lockBoxAddress}`);
    console.log(`LUSD Token:         ${lusdAddress}`);
    console.log(`Issuer Controller:  ${issuerControllerAddress}`);
    console.log("─────────────────────────────────────────────────────────────────");
    console.log("");
    console.log("Copy these addresses to the DCB Treasury Certification Platform");
    console.log("configuration in the web interface.");
    console.log("");
    
    // Save deployment info
    const deploymentInfo = {
      network: "LemonChain",
      chainId: 1006,
      deployedAt: new Date().toISOString(),
      contracts: {
        usd: usdAddress,
        bankRegistry: bankRegistryAddress,
        custodyFactory: custodyFactoryAddress,
        lockBox: lockBoxAddress,
        lusd: lusdAddress,
        issuerController: issuerControllerAddress
      },
      roles: {
        admin: WALLETS.admin.address,
        daesSigner: WALLETS.daesSigner.address,
        bankSigner: WALLETS.bankSigner.address,
        issuerOperator: WALLETS.issuerOperator.address,
        approver: WALLETS.approver.address
      }
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
    if (error.message.includes('Artifact not found')) {
      console.log("Please compile contracts first:");
      console.log("  npx hardhat compile");
    }
  }
}

main().catch(console.error);
