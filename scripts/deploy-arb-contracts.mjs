/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 DEPLOY ARBITRAGE CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Despliega FlashLoanArbitrage y MultiDexExecutor en Base y Arbitrum
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAIN_CONFIG = {
  base: {
    name: "Base",
    chainId: 8453,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
    // Uniswap V3
    uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    uniswapV3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    // SushiSwap (Base doesn't have Sushi, use Aerodrome instead)
    sushiRouter: "0x0000000000000000000000000000000000000000", // Placeholder
    // Tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x0000000000000000000000000000000000000000",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    // Aave V3 Pool Addresses Provider
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    // Uniswap V3
    uniswapV3Router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    uniswapV3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    // SushiSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Tokens
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function deployToNetwork(networkName) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`🚀 Deploying to ${networkName.toUpperCase()}`);
  console.log(`${"═".repeat(70)}\n`);

  const config = CHAIN_CONFIG[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log();

  // Check if we have enough balance
  const minBalance = hre.ethers.parseEther("0.001");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.001 ETH`);
  }

  const deployedContracts = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Deploy MultiDexExecutor
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log("📦 Deploying MultiDexExecutor...");
  
  const MultiDexExecutor = await hre.ethers.getContractFactory("MultiDexExecutor");
  const multiDexExecutor = await MultiDexExecutor.deploy(
    config.uniswapV3Router,
    config.uniswapV3Quoter,
    config.sushiRouter || "0x0000000000000000000000000000000000000000",
    config.WETH,
    config.USDC
  );
  
  await multiDexExecutor.waitForDeployment();
  const multiDexAddress = await multiDexExecutor.getAddress();
  
  console.log(`✅ MultiDexExecutor deployed: ${multiDexAddress}`);
  deployedContracts.MultiDexExecutor = multiDexAddress;

  // Configure tokens
  console.log("⚙️ Configuring tokens...");
  const setTokensTx = await multiDexExecutor.setTokens(
    config.WETH,
    config.USDC,
    config.USDT || "0x0000000000000000000000000000000000000000",
    config.DAI || "0x0000000000000000000000000000000000000000"
  );
  await setTokensTx.wait();
  console.log("✅ Tokens configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Deploy FlashLoanArbitrage (only if Aave is available)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (config.aavePoolProvider && config.aavePoolProvider !== "0x0000000000000000000000000000000000000000") {
    console.log("\n📦 Deploying FlashLoanArbitrage...");
    
    try {
      const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
      const flashLoanArbitrage = await FlashLoanArbitrage.deploy(
        config.aavePoolProvider,
        config.uniswapV3Router,
        config.sushiRouter || "0x0000000000000000000000000000000000000000",
        config.WETH,
        config.USDC
      );
      
      await flashLoanArbitrage.waitForDeployment();
      const flashLoanAddress = await flashLoanArbitrage.getAddress();
      
      console.log(`✅ FlashLoanArbitrage deployed: ${flashLoanAddress}`);
      deployedContracts.FlashLoanArbitrage = flashLoanAddress;

      // Configure tokens
      console.log("⚙️ Configuring FlashLoan tokens...");
      const setFlashTokensTx = await flashLoanArbitrage.setTokens(
        config.WETH,
        config.USDC,
        config.USDT || "0x0000000000000000000000000000000000000000",
        config.DAI || "0x0000000000000000000000000000000000000000"
      );
      await setFlashTokensTx.wait();
      console.log("✅ FlashLoan tokens configured");
      
    } catch (error) {
      console.log(`⚠️ FlashLoanArbitrage deployment failed: ${error.message}`);
      console.log("   (This may be due to Aave not being available on this network)");
    }
  } else {
    console.log("\n⚠️ Skipping FlashLoanArbitrage (Aave not available on this network)");
  }

  return {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    contracts: deployedContracts,
    config: {
      uniswapV3Router: config.uniswapV3Router,
      uniswapV3Quoter: config.uniswapV3Quoter,
      sushiRouter: config.sushiRouter,
      WETH: config.WETH,
      USDC: config.USDC
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════
  
   🚀 ARBITRAGE CONTRACTS DEPLOYMENT
   
   Contracts:
   - MultiDexExecutor: Multi-DEX arbitrage executor
   - FlashLoanArbitrage: Aave V3 Flash Loan arbitrage
   
═══════════════════════════════════════════════════════════════════════════════
  `);

  const networkName = hre.network.name;
  console.log(`📍 Target Network: ${networkName}`);

  if (networkName === "hardhat" || networkName === "localhost") {
    console.log("\n⚠️ Running on local network. For mainnet deployment, use:");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network base");
    console.log("   npx hardhat run scripts/deploy-arb-contracts.mjs --network arbitrum");
    return;
  }

  try {
    const result = await deployToNetwork(networkName);
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      ...result
    };
    
    const deploymentPath = path.join(__dirname, "..", `deployment-${networkName}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`\n${"═".repeat(70)}`);
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log(`${"═".repeat(70)}`);
    console.log(`\n📄 Deployment info saved to: ${deploymentPath}`);
    console.log("\n📋 Deployed Contracts:");
    for (const [name, address] of Object.entries(result.contracts)) {
      console.log(`   ${name}: ${address}`);
    }
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





