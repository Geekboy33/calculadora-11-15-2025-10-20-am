/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS - DIRECT ETHERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (from artifacts)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deploy(networkKey) {
  const config = CHAINS[networkKey];
  if (!config) {
    console.error(`Unknown network: ${networkKey}`);
    console.log('Available networks:', Object.keys(CHAINS).join(', '));
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_ETH_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 DEPLOYING TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    console.error('❌ Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  try {
    const multiDexArtifact = await loadArtifact('MultiDexExecutor');
    
    const MultiDexFactory = new ethers.ContractFactory(
      multiDexArtifact.abi,
      multiDexArtifact.bytecode,
      wallet
    );
    
    const multiDexExecutor = await MultiDexFactory.deploy(
      config.uniswapV3Router,
      config.uniswapV3Quoter,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 3000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await multiDexExecutor.waitForDeployment();
    
    const multiDexAddress = await multiDexExecutor.getAddress();
    console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${multiDexAddress}`);
    
    deployedContracts.MultiDexExecutor = multiDexAddress;

    // Configure tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await multiDexExecutor.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");
    
  } catch (error) {
    console.error(`❌ MultiDexExecutor deployment failed: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Save deployment info
  // ═══════════════════════════════════════════════════════════════════════════
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkKey,
    chainId: config.chainId,
    deployer: wallet.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'base';
deploy(network).catch(console.error);





