/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY FLASH LOAN ARBITRAGE - OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega el contrato FlashLoanArbitrage en Optimism para:
 * - Flash Loans de $1k-$10k sin colateral
 * - Arbitraje atómico multi-DEX
 * - Estrategias: Intra-DEX, Cross-DEX, Triangular
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
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    // Aave V3 Pool Addresses Provider
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // Velodrome (SushiSwap equivalent on Optimism)
    sushiRouter: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velodrome Router
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
    USDCe: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC.e
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    OP: "0x4200000000000000000000000000000000000042"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
    explorer: "https://basescan.org",
    aavePoolAddressesProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    sushiRouter: "0x0000000000000000000000000000000000000000",
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
    aavePoolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD ARTIFACT
// ═══════════════════════════════════════════════════════════════════════════════

async function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FLASH LOAN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

async function deployFlashLoan(networkKey) {
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
  
   ⚡ DEPLOYING FLASH LOAN ARBITRAGE TO ${config.name.toUpperCase()}
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`📍 Deployer: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain: ${config.name} (${config.chainId})`);
  console.log();

  if (balance < ethers.parseEther("0.002")) {
    console.error('❌ Insufficient balance. Need at least 0.002 ETH for deployment');
    process.exit(1);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Deploy FlashLoanArbitrage
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("⚡ Deploying FlashLoanArbitrage...");
  console.log(`   Aave Pool Provider: ${config.aavePoolAddressesProvider}`);
  console.log(`   Uniswap V3 Router: ${config.uniswapV3Router}`);
  console.log(`   Sushi/Velo Router: ${config.sushiRouter}`);
  
  try {
    const flashLoanArtifact = await loadArtifact('FlashLoanArbitrage');
    
    const FlashLoanFactory = new ethers.ContractFactory(
      flashLoanArtifact.abi,
      flashLoanArtifact.bytecode,
      wallet
    );
    
    // Constructor: (poolAddressesProvider, uniswapV3Router, sushiRouter, weth, usdc)
    const flashLoanContract = await FlashLoanFactory.deploy(
      config.aavePoolAddressesProvider,
      config.uniswapV3Router,
      config.sushiRouter,
      config.WETH,
      config.USDC,
      { gasLimit: 4000000 }
    );
    
    console.log(`⏳ Waiting for confirmation...`);
    await flashLoanContract.waitForDeployment();
    
    const flashLoanAddress = await flashLoanContract.getAddress();
    console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
    console.log(`   🔗 ${config.explorer}/address/${flashLoanAddress}`);
    
    deployedContracts.FlashLoanArbitrage = flashLoanAddress;

    // Configure additional tokens
    console.log("⚙️ Configuring tokens...");
    const setTokensTx = await flashLoanContract.setTokens(
      config.WETH,
      config.USDC,
      config.USDT,
      config.DAI,
      { gasLimit: 100000 }
    );
    await setTokensTx.wait();
    console.log("✅ Tokens configured");

    // Set min profit to 0.1% (10 bps)
    console.log("⚙️ Setting min profit to 0.1%...");
    const setMinProfitTx = await flashLoanContract.setMinProfitBps(10, { gasLimit: 50000 });
    await setMinProfitTx.wait();
    console.log("✅ Min profit set");
    
  } catch (error) {
    console.error(`❌ FlashLoanArbitrage deployment failed: ${error.message}`);
    throw error;
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
      aavePoolAddressesProvider: config.aavePoolAddressesProvider,
      uniswapV3Router: config.uniswapV3Router,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC,
      USDT: config.USDT,
      DAI: config.DAI
    },
    features: [
      "Flash Loans $1k-$10k sin colateral",
      "Intra-DEX Arbitrage (fee tiers)",
      "Cross-DEX Arbitrage (Uniswap ↔ Velodrome/Sushi)",
      "Triangular Arbitrage (WETH-USDC-DAI)",
      "MEV Protection (deadline, slippage)",
      "Profit validation antes de ejecutar"
    ]
  };
  
  const deploymentPath = path.join(__dirname, '..', `deployment-flashloan-${networkKey}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n${"═".repeat(70)}`);
  console.log("✅ FLASH LOAN CONTRACT DEPLOYMENT COMPLETE!");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n📄 Saved to: ${deploymentPath}`);
  console.log(`\n💡 Funcionalidades disponibles:`);
  deploymentInfo.features.forEach(f => console.log(`   • ${f}`));
  
  return deploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const network = process.argv[2] || 'optimism';
deployFlashLoan(network).catch(console.error);




