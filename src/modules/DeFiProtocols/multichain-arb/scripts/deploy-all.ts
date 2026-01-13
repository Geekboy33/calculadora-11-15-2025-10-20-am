// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);



// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);


// SCRIPT DE DESPLIEGUE MULTI-CADENA
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE CADENAS
// ─────────────────────────────────────────────────────────────────────────────────

interface ChainDeployConfig {
  name: string;
  chainId: number;
  rpc: string;
  swapRouter: string;
  factory: string;
  explorer: string;
}

const CHAINS: Record<string, ChainDeployConfig> = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: process.env.BASE_RPC_SEND || "https://mainnet.base.org",
    swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    explorer: "https://basescan.org"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: process.env.ARB_RPC_SEND || "https://arb1.arbitrum.io/rpc",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpc: process.env.OP_RPC_SEND || "https://mainnet.optimism.io",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://optimistic.etherscan.io"
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpc: process.env.POLY_RPC_SEND || "https://polygon-rpc.com",
    swapRouter: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    explorer: "https://polygonscan.com"
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE DESPLIEGUE
// ─────────────────────────────────────────────────────────────────────────────────

async function deployContract(
  chainKey: string,
  contractName: string,
  constructorArgs: any[]
): Promise<{ address: string; txHash: string } | null> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return null;
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY no configurada");
    return null;
  }

  console.log(`\n📦 Desplegando ${contractName} en ${config.name}...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`   Wallet: ${wallet.address}`);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.error(`   ❌ Sin balance en ${config.name}`);
      return null;
    }

    // Cargar artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact no encontrado. Ejecuta 'npx hardhat compile' primero.`);
      console.error(`   Path esperado: ${artifactPath}`);
      return null;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Desplegar
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log(`   Desplegando...`);
    const contract = await factory.deploy(...constructorArgs);
    
    console.log(`   TX Hash: ${contract.deploymentTransaction()?.hash}`);
    console.log(`   Esperando confirmación...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Desplegado en: ${address}`);
    console.log(`   Explorer: ${config.explorer}/address/${address}`);

    return {
      address,
      txHash: contract.deploymentTransaction()?.hash || ""
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function deployAllContracts(chainKey: string): Promise<void> {
  const config = CHAINS[chainKey];
  if (!config) {
    console.error(`❌ Cadena desconocida: ${chainKey}`);
    return;
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(`DESPLEGANDO EN ${config.name.toUpperCase()}`);
  console.log(`${"═".repeat(80)}`);

  const deployments: Record<string, any> = {};

  // 1. Desplegar ArbExecutorV2
  const arbExecutor = await deployContract(chainKey, "ArbExecutorV2", [config.swapRouter]);
  if (arbExecutor) {
    deployments.ArbExecutorV2 = arbExecutor;
  }

  // 2. Desplegar FlashArbExecutor
  const flashExecutor = await deployContract(chainKey, "FlashArbExecutor", [config.swapRouter, config.factory]);
  if (flashExecutor) {
    deployments.FlashArbExecutor = flashExecutor;
  }

  // 3. Desplegar MultiDexArbExecutor
  const multiDexExecutor = await deployContract(chainKey, "MultiDexArbExecutor", [config.swapRouter]);
  if (multiDexExecutor) {
    deployments.MultiDexArbExecutor = multiDexExecutor;
  }

  // Guardar deployments
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentsPath = path.join(deploymentsDir, `${chainKey}.json`);
  fs.writeFileSync(deploymentsPath, JSON.stringify({
    chain: config.name,
    chainId: config.chainId,
    timestamp: new Date().toISOString(),
    contracts: deployments
  }, null, 2));

  console.log(`\n📄 Deployments guardados en: ${deploymentsPath}`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 DESPLIEGUE MULTI-CADENA - ARBITRAGE CONTRACTS                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Uso: npx tsx scripts/deploy-all.ts [cadenas...]");
    console.log("Ejemplo: npx tsx scripts/deploy-all.ts base arbitrum");
    console.log("\nCadenas disponibles: base, arbitrum, optimism, polygon");
    console.log("\nPara desplegar en todas: npx tsx scripts/deploy-all.ts all");
    return;
  }

  const chainsToDeply = args[0] === "all" ? Object.keys(CHAINS) : args;

  console.log(`Cadenas a desplegar: ${chainsToDeply.join(", ")}`);

  for (const chain of chainsToDeply) {
    if (!CHAINS[chain]) {
      console.error(`\n❌ Cadena desconocida: ${chain}`);
      continue;
    }
    await deployAllContracts(chain);
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("✅ DESPLIEGUE COMPLETADO");
  console.log(`${"═".repeat(80)}\n`);
}

main().catch(console.error);




