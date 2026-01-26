/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ██████╗  ██████╗██████╗     ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗║
 * ║     ██╔══██╗██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝║
 * ║     ██║  ██║██║     ██████╔╝       ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝ ║
 * ║     ██║  ██║██║     ██╔══██╗       ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝  ║
 * ║     ██████╔╝╚██████╗██████╔╝       ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║   ║
 * ║     ╚═════╝  ╚═════╝╚═════╝        ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ║
 * ║                                                                                                  ║
 * ║                     FULL DEPLOYMENT v3.0 - DCB TREASURY CERTIFICATION PLATFORM                   ║
 * ║                              Digital Commercial Bank Ltd - LemonChain                            ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  CONTRATOS A DESPLEGAR:                                                                          ║
 * ║  ├─ 📊 PriceOracle.sol      - Oracle de precios ($1.00 USD fijo para LUSD)                      ║
 * ║  ├─ 🏦 BankRegistry.sol     - Registro de bancos con governance multi-sig                       ║
 * ║  ├─ 🔒 LockBox.sol          - Sistema de custodia con timelock                                  ║
 * ║  ├─ 🪙 USD.sol              - Token USD con swap 1:1 a LUSD                                     ║
 * ║  ├─ 🏛️ CustodyVault.sol     - Gestión de vaults de custodia                                     ║
 * ║  └─ 🌉 MintingBridge.sol    - Puente de minting LEMX                                            ║
 * ║                                                                                                  ║
 * ║  NOTA: LUSD ya está desplegado en 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // LemonChain Network
  network: {
    name: 'LemonChain',
    rpc: 'https://rpc.lemonchain.io',
    chainId: 1006,
    explorer: 'https://explorer.lemonchain.io'
  },
  
  // Admin wallet (deployer)
  adminKey: '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080',
  
  // Official LUSD Contract (already deployed - DO NOT REDEPLOY)
  lusdContract: '0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99',
  
  // Gas settings
  gasLimit: 8000000
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    header: '\x1b[35m',  // Magenta
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function loadArtifact(contractName) {
  const possiblePaths = [
    path.join(__dirname, '..', 'artifacts', 'contracts', 'DCBTreasury', 'v3', `${contractName}.sol`, `${contractName}.json`),
    path.join(__dirname, '..', 'artifacts', 'contracts', 'DCBTreasury', 'v3', 'interfaces', `${contractName}.sol`, `${contractName}.json`),
  ];
  
  for (const artifactPath of possiblePaths) {
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact;
    }
  }
  
  throw new Error(`Artifact not found for ${contractName}. Run 'npx hardhat compile' first.`);
}

async function deployContract(wallet, contractName, constructorArgs = []) {
  log(`\n${'═'.repeat(70)}`, 'header');
  log(`Deploying ${contractName}...`, 'header');
  log(`${'═'.repeat(70)}`, 'header');
  
  try {
    const artifact = loadArtifact(contractName);
    
    log(`Contract: ${contractName}`, 'info');
    log(`Bytecode size: ${(artifact.bytecode.length / 2 - 1).toLocaleString()} bytes`, 'info');
    log(`Constructor args: ${JSON.stringify(constructorArgs)}`, 'info');
    
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    log('Sending deployment transaction...', 'info');
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: CONFIG.gasLimit
    });
    
    log(`Transaction hash: ${contract.deploymentTransaction().hash}`, 'info');
    log('Waiting for confirmation...', 'info');
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    log(`✅ ${contractName} deployed at: ${address}`, 'success');
    log(`Explorer: ${CONFIG.network.explorer}/address/${address}`, 'info');
    
    return { address, contract, artifact };
    
  } catch (error) {
    log(`❌ Failed to deploy ${contractName}: ${error.message}`, 'error');
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DEPLOYMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                  ║
║     ██████╗  ██████╗██████╗     ████████╗██████╗ ███████╗ █████╗ ███████╗██╗   ██╗██████╗ ██╗   ██╗║
║     ██╔══██╗██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗╚██╗ ██╔╝║
║     ██║  ██║██║     ██████╔╝       ██║   ██████╔╝█████╗  ███████║███████╗██║   ██║██████╔╝ ╚████╔╝ ║
║     ██║  ██║██║     ██╔══██╗       ██║   ██╔══██╗██╔══╝  ██╔══██║╚════██║██║   ██║██╔══██╗  ╚██╔╝  ║
║     ██████╔╝╚██████╗██████╔╝       ██║   ██║  ██║███████╗██║  ██║███████║╚██████╔╝██║  ██║   ██║   ║
║     ╚═════╝  ╚═════╝╚═════╝        ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ║
║                                                                                                  ║
║                      FULL SMART CONTRACTS v3.0 DEPLOYMENT                                        ║
║                      Digital Commercial Bank Ltd - LemonChain                                    ║
║                                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Connect to LemonChain
  log('Connecting to LemonChain...', 'info');
  const provider = new ethers.JsonRpcProvider(CONFIG.network.rpc);
  const wallet = new ethers.Wallet(CONFIG.adminKey, provider);
  
  // Get network info
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet.address);
  
  log(`Network: ${CONFIG.network.name} (Chain ID: ${network.chainId})`, 'success');
  log(`Deployer: ${wallet.address}`, 'info');
  log(`Balance: ${ethers.formatEther(balance)} LEMX`, 'info');
  
  if (balance < ethers.parseEther('0.5')) {
    log('⚠️ Warning: Low balance. Deployment may fail.', 'warning');
  }
  
  // Track deployed contracts
  const deployed = {
    lusd: CONFIG.lusdContract,
    priceOracle: null,
    bankRegistry: null,
    lockBox: null,
    usd: null,
    custodyVault: null,
    mintingBridge: null
  };
  
  log(`\n${'═'.repeat(70)}`, 'header');
  log('LUSD Contract (Already Deployed)', 'header');
  log(`${'═'.repeat(70)}`, 'header');
  log(`Address: ${CONFIG.lusdContract}`, 'success');
  log('Note: Using existing LUSD contract - not redeploying', 'info');
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy PriceOracle
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'PriceOracle', []);
    deployed.priceOracle = result.address;
  } catch (error) {
    log('Skipping PriceOracle deployment due to error', 'warning');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy BankRegistry
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'BankRegistry', []);
    deployed.bankRegistry = result.address;
  } catch (error) {
    log('Skipping BankRegistry deployment due to error', 'warning');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy LockBox (requires treasury address)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'LockBox', [wallet.address]);
    deployed.lockBox = result.address;
  } catch (error) {
    log('Skipping LockBox deployment due to error', 'warning');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy USD
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'USD', []);
    deployed.usd = result.address;
  } catch (error) {
    log('Skipping USD deployment due to error', 'warning');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy CustodyVault (requires treasury address)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'CustodyVault', [wallet.address]);
    deployed.custodyVault = result.address;
  } catch (error) {
    log('Skipping CustodyVault deployment due to error', 'warning');
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Deploy MintingBridge
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const result = await deployContract(wallet, 'MintingBridge', []);
    deployed.mintingBridge = result.address;
  } catch (error) {
    log('Skipping MintingBridge deployment due to error', 'warning');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIGURE CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  log(`\n${'═'.repeat(70)}`, 'header');
  log('Configuring contracts...', 'header');
  log(`${'═'.repeat(70)}`, 'header');
  
  // Link CustodyVault to MintingBridge
  if (deployed.custodyVault && deployed.mintingBridge) {
    try {
      const custodyVaultArtifact = loadArtifact('CustodyVault');
      const custodyVault = new ethers.Contract(deployed.custodyVault, custodyVaultArtifact.abi, wallet);
      
      log('Setting MintingBridge in CustodyVault...', 'info');
      const tx1 = await custodyVault.setMintingBridge(deployed.mintingBridge);
      await tx1.wait();
      log('✅ MintingBridge set in CustodyVault', 'success');
      
      if (deployed.bankRegistry) {
        log('Setting BankRegistry in CustodyVault...', 'info');
        const tx2 = await custodyVault.setBankRegistry(deployed.bankRegistry);
        await tx2.wait();
        log('✅ BankRegistry set in CustodyVault', 'success');
      }
      
      // Add deployer as bank signer
      log('Adding deployer as bank signer...', 'info');
      const tx3 = await custodyVault.setBankSigner(wallet.address, true);
      await tx3.wait();
      log('✅ Deployer added as bank signer', 'success');
      
    } catch (error) {
      log(`Configuration error: ${error.message}`, 'warning');
    }
  }
  
  // Link MintingBridge to CustodyVault
  if (deployed.mintingBridge && deployed.custodyVault) {
    try {
      const mintingBridgeArtifact = loadArtifact('MintingBridge');
      const mintingBridge = new ethers.Contract(deployed.mintingBridge, mintingBridgeArtifact.abi, wallet);
      
      log('Setting CustodyVault in MintingBridge...', 'info');
      const tx = await mintingBridge.setCustodyVault(deployed.custodyVault);
      await tx.wait();
      log('✅ CustodyVault set in MintingBridge', 'success');
      
    } catch (error) {
      log(`Configuration error: ${error.message}`, 'warning');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║                           FULL DEPLOYMENT SUMMARY v3.0                                           ║
╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Network: LemonChain (Chain ID: ${network.chainId})                                                         ║
║  Deployer: ${wallet.address}                                       ║
╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
║  DEPLOYED CONTRACTS:                                                                             ║
║  ├─ 🔐 LUSD (Official):    ${deployed.lusd}  ✅ EXISTING     ║
║  ├─ 📊 PriceOracle:        ${(deployed.priceOracle || 'NOT DEPLOYED').padEnd(42)}  ${deployed.priceOracle ? '✅ NEW' : '❌'}          ║
║  ├─ 🏦 BankRegistry:       ${(deployed.bankRegistry || 'NOT DEPLOYED').padEnd(42)}  ${deployed.bankRegistry ? '✅ NEW' : '❌'}          ║
║  ├─ 🔒 LockBox:            ${(deployed.lockBox || 'NOT DEPLOYED').padEnd(42)}  ${deployed.lockBox ? '✅ NEW' : '❌'}          ║
║  ├─ 🪙 USD:                ${(deployed.usd || 'NOT DEPLOYED').padEnd(42)}  ${deployed.usd ? '✅ NEW' : '❌'}          ║
║  ├─ 🏛️ CustodyVault:       ${(deployed.custodyVault || 'NOT DEPLOYED').padEnd(42)}  ${deployed.custodyVault ? '✅ NEW' : '❌'}          ║
║  └─ 🌉 MintingBridge:      ${(deployed.mintingBridge || 'NOT DEPLOYED').padEnd(42)}  ${deployed.mintingBridge ? '✅ NEW' : '❌'}          ║
╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
║  DCB TREASURY FLOW:                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ ║
║  │  Custody Account (M1) → CustodyVault → Lock → Consume & Mint → MintingBridge → LUSD        │ ║
║  └─────────────────────────────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
  `);
  
  // Save deployment info
  const deploymentInfo = {
    version: '3.0.0',
    network: CONFIG.network.name,
    chainId: Number(network.chainId),
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: deployed,
    flow: {
      step1: 'Select M1 Custody Account with USD funds',
      step2: 'Create CustodyVault on blockchain',
      step3: 'Create Lock with bank signature',
      step4: 'Consume & Mint generates authorization code',
      step5: 'LEMX MintingBridge mints LUSD',
      step6: 'Publication in Mint Explorer'
    }
  };
  
  const outputPath = path.join(__dirname, '..', 'deployments', 'dcb-v3-full-deployment.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  
  log(`\nDeployment info saved to: ${outputPath}`, 'success');
  
  // Generate TypeScript constants
  const tsConstants = `
// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY v3.0 - FULL DEPLOYED CONTRACT ADDRESSES
// Generated: ${new Date().toISOString()}
// Network: LemonChain (Chain ID: ${network.chainId})
// ═══════════════════════════════════════════════════════════════════════════════

export const DCB_CONTRACTS_V3_FULL = {
  // Network
  CHAIN_ID: ${network.chainId},
  NETWORK_NAME: 'LemonChain',
  RPC_URL: '${CONFIG.network.rpc}',
  EXPLORER: '${CONFIG.network.explorer}',
  
  // Core Contracts
  LUSD: '${deployed.lusd}',
  PRICE_ORACLE: '${deployed.priceOracle || ''}',
  BANK_REGISTRY: '${deployed.bankRegistry || ''}',
  LOCK_BOX: '${deployed.lockBox || ''}',
  USD: '${deployed.usd || ''}',
  
  // DCB Treasury Flow Contracts
  CUSTODY_VAULT: '${deployed.custodyVault || ''}',
  MINTING_BRIDGE: '${deployed.mintingBridge || ''}',
} as const;

export const OFFICIAL_LUSD_CONTRACT = '${deployed.lusd}';

// DCB Treasury Flow
export const DCB_TREASURY_FLOW = {
  STEP_1: 'Select M1 Custody Account with USD funds',
  STEP_2: 'Create CustodyVault on blockchain',
  STEP_3: 'Create Lock with bank signature (EIP-712)',
  STEP_4: 'Consume & Mint generates authorization code (MINT-XXXX-YYYY)',
  STEP_5: 'LEMX MintingBridge verifies and mints LUSD',
  STEP_6: 'Publication in Mint Explorer with TX hash'
} as const;
`;
  
  const tsOutputPath = path.join(__dirname, '..', 'src', 'lib', 'dcb-contracts-v3-full.ts');
  fs.writeFileSync(tsOutputPath, tsConstants);
  log(`TypeScript constants saved to: ${tsOutputPath}`, 'success');
  
  return deployed;
}

// Run deployment
main()
  .then((deployed) => {
    log('\n✅ Full deployment completed successfully!', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Deployment failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
