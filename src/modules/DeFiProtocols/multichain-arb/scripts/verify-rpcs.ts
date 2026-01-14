// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);



// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);


// SCRIPT DE VERIFICACIÓN DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from "ethers";
import "dotenv/config";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcRead: string | undefined;
  rpcSim: string | undefined;
  rpcSend: string | undefined;
  rpcWs: string | undefined;
  nativeCurrency: string;
  explorer: string;
}

const chains: ChainConfig[] = [
  {
    name: "Base",
    chainId: 8453,
    rpcRead: process.env.BASE_RPC_READ,
    rpcSim: process.env.BASE_RPC_SIM,
    rpcSend: process.env.BASE_RPC_SEND,
    rpcWs: process.env.BASE_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpcRead: process.env.ARB_RPC_READ,
    rpcSim: process.env.ARB_RPC_SIM,
    rpcSend: process.env.ARB_RPC_SEND,
    rpcWs: process.env.ARB_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    rpcRead: process.env.OP_RPC_READ,
    rpcSim: process.env.OP_RPC_SIM,
    rpcSend: process.env.OP_RPC_SEND,
    rpcWs: process.env.OP_RPC_WS,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    rpcRead: process.env.POLY_RPC_READ,
    rpcSim: process.env.POLY_RPC_SIM,
    rpcSend: process.env.POLY_RPC_SEND,
    rpcWs: process.env.POLY_RPC_WS,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  }
];

async function verifyRpc(url: string | undefined, expectedChainId: number): Promise<{
  success: boolean;
  blockNumber?: number;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();
  
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    const latency = Date.now() - start;

    if (Number(network.chainId) !== expectedChainId) {
      return { 
        success: false, 
        error: `Chain ID incorrecto: esperado ${expectedChainId}, recibido ${network.chainId}` 
      };
    }

    return { success: true, blockNumber, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function verifyWebSocket(url: string | undefined): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  if (!url) {
    return { success: false, error: "URL no configurada" };
  }

  const start = Date.now();

  try {
    const provider = new ethers.WebSocketProvider(url);
    await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    // Cerrar conexión
    await provider.destroy();
    
    return { success: true, latency };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWalletBalance(chain: ChainConfig): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !chain.rpcRead) {
    return "N/A";
  }

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpcRead);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return `${ethers.formatEther(balance)} ${chain.nativeCurrency}`;
  } catch {
    return "Error";
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🔍 VERIFICACIÓN DE RPCs - MULTI-CHAIN ARBITRAGE BOT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verificar private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("⚠️  PRIVATE_KEY no configurada o es placeholder\n");
  } else {
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet: ${wallet.address}\n`);
    } catch {
      console.log("❌ PRIVATE_KEY inválida\n");
    }
  }

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const chain of chains) {
    console.log(`\n═══ ${chain.name} (Chain ID: ${chain.chainId}) ═══`);
    console.log(`Explorer: ${chain.explorer}\n`);

    // Verificar READ RPC
    process.stdout.write("  READ RPC:  ");
    const readResult = await verifyRpc(chain.rpcRead, chain.chainId);
    if (readResult.success) {
      console.log(`✅ OK (Block #${readResult.blockNumber}, ${readResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${readResult.error}`);
      totalFailed++;
    }

    // Verificar SIM RPC
    process.stdout.write("  SIM RPC:   ");
    const simResult = await verifyRpc(chain.rpcSim, chain.chainId);
    if (simResult.success) {
      console.log(`✅ OK (${simResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${simResult.error}`);
      totalFailed++;
    }

    // Verificar SEND RPC
    process.stdout.write("  SEND RPC:  ");
    const sendResult = await verifyRpc(chain.rpcSend, chain.chainId);
    if (sendResult.success) {
      console.log(`✅ OK (${sendResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${sendResult.error}`);
      totalFailed++;
    }

    // Verificar WebSocket
    process.stdout.write("  WS RPC:    ");
    const wsResult = await verifyWebSocket(chain.rpcWs);
    if (wsResult.success) {
      console.log(`✅ OK (${wsResult.latency}ms)`);
      totalSuccess++;
    } else {
      console.log(`❌ ${wsResult.error}`);
      totalFailed++;
    }

    // Verificar balance
    process.stdout.write("  Balance:   ");
    const balance = await checkWalletBalance(chain);
    console.log(balance);
  }

  // Resumen
  console.log(`
════════════════════════════════════════════════════════════════════════════════

📊 RESUMEN:
  ✅ Exitosos: ${totalSuccess}
  ❌ Fallidos: ${totalFailed}
  📈 Tasa de éxito: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%

`);

  if (totalFailed > 0) {
    console.log(`⚠️  Algunos RPCs fallaron. Revisa la configuración en .env`);
    console.log(`   Consulta GUIA_RPC_COMPLETA.md para más información.\n`);
  } else {
    console.log(`✅ ¡Todos los RPCs funcionan correctamente!`);
    console.log(`   El bot está listo para ejecutarse.\n`);
  }
}

main().catch(console.error);





