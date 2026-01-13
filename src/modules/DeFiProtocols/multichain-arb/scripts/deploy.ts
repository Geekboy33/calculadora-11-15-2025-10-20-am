// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);



// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);


// MULTI-CHAIN MICRO ARBITRAGE BOT - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This script deploys the ArbExecutor contract to multiple chains
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CHAIN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainConfig {
  name: string;
  rpc: string;
  swapRouter: string;
  chainId: number;
  explorer: string;
}

const CHAINS: Record<string, ChainConfig> = {
  base: {
    name: "Base",
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap V3 SwapRouter02
    chainId: 8453,
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 10,
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter02
    chainId: 137,
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT ABI & BYTECODE
// ─────────────────────────────────────────────────────────────────────────────────

// Minimal ABI for deployment verification
const EXECUTOR_ABI = [
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)"
];

// Note: In production, you would compile the contract and use the actual bytecode
// For now, this is a placeholder - you need to compile ArbExecutor.sol
const BYTECODE_PLACEHOLDER = "0x"; // Replace with actual compiled bytecode

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function deployToChain(chainKey: string): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`Unknown chain: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY not set in environment");
    return null;
  }

  console.log(`\n📦 Deploying to ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ No balance on ${config.name}`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Deploy contract
    // Note: Replace BYTECODE_PLACEHOLDER with actual bytecode from compilation
    if (BYTECODE_PLACEHOLDER === "0x") {
      console.error("   ⚠️  Bytecode not set. Compile ArbExecutor.sol first.");
      console.log("   Run: npx hardhat compile");
      return null;
    }

    const factory = new ethers.ContractFactory(EXECUTOR_ABI, BYTECODE_PLACEHOLDER, wallet);
    const contract = await factory.deploy(config.swapRouter, {
      gasPrice: gasPrice * 110n / 100n // 10% buffer
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Deployment failed: ${error.message}`);
    return null;
  }
}

async function verifyDeployment(chainKey: string, address: string): Promise<boolean> {
  const config = CHAINS[chainKey];
  if (!config) return false;

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(address, EXECUTOR_ABI, provider);

    const owner = await contract.owner();
    const router = await contract.swapRouter();

    console.log(`\n🔍 Verifying ${config.name} deployment:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Router: ${router}`);
    console.log(`   Expected Router: ${config.swapRouter}`);

    if (router.toLowerCase() !== config.swapRouter.toLowerCase()) {
      console.error(`   ❌ Router mismatch!`);
      return false;
    }

    console.log(`   ✅ Verification passed`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 ARBEXECUTOR DEPLOYMENT SCRIPT                                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const targetChains = process.argv.slice(2);
  const chains = targetChains.length > 0 ? targetChains : Object.keys(CHAINS);

  console.log(`Target chains: ${chains.join(", ")}`);

  const deployments: Record<string, { address: string; txHash: string }> = {};

  for (const chain of chains) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);

  // Verify deployments
  console.log("\n🔍 Verifying deployments...");
  for (const [chain, info] of Object.entries(deployments)) {
    await verifyDeployment(chain, info.address);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch(console.error);




