#!/usr/bin/env node

/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 SCRIPT: Ejecutar USD → USDT SWAP
 * 
 * Uso:
 * node swap-test.js 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Obtener argumentos
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '100');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🔄 USD → USDT SWAP EXECUTION                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📋 Parámetros:');
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Dirección: ${destAddress}`);
console.log(`   Timestamp: ${new Date().toISOString()}`);

// Verificar credenciales
if (!process.env.VITE_ETH_RPC_URL) {
  console.error('❌ Error: VITE_ETH_RPC_URL no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_PRIVATE_KEY) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY no está configurada');
  process.exit(1);
}

if (!process.env.VITE_ETH_WALLET_ADDRESS) {
  console.error('❌ Error: VITE_ETH_WALLET_ADDRESS no está configurada');
  process.exit(1);
}

// Ejecutar swap
(async () => {
  try {
    console.log('\n🔧 Inicializando SWAP...\n');

    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: process.env.VITE_ETH_PRIVATE_KEY,
      walletAddress: process.env.VITE_ETH_WALLET_ADDRESS,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ RESULTADO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles:');
    console.log(`   Éxito: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 Transacción:`);
      console.log(`   Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✅ ¡Swap completado!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







