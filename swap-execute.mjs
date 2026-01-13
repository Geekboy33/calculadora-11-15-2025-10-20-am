#!/usr/bin/env node

/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();






/**
 * 🚀 EJECUTAR SWAP USD → USDT DIRECTAMENTE
 * Con Private Key ya configurada
 */

import dotenv from 'dotenv';

// Cargar configuración
dotenv.config({ path: '.env.local' });

// O configurar directamente si no hay .env.local
const config = {
  rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
  privateKey: process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  walletAddress: process.env.VITE_ETH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9',
  usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
};

// Importar clase de swap
import USDToUSDTSwap from './src/lib/usd-usdt-swap-improved.ts';

// Parámetros
const args = process.argv.slice(2);
const usdAmount = parseFloat(args[0] || '1000');
const destAddress = args[1] || '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║          🚀 USD → USDT SWAP - EJECUTANDO              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🔧 Configuración:');
console.log(`   RPC: ${config.rpcUrl.substring(0, 60)}...`);
console.log(`   Wallet: ${config.walletAddress}`);
console.log(`   USDT Contract: ${config.usdtContract}`);
console.log(`   USD Monto: $${usdAmount}`);
console.log(`   Destino: ${destAddress}\n`);

(async () => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: config.rpcUrl,
      usdtContract: config.usdtContract,
      privateKey: config.privateKey,
      walletAddress: config.walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    console.log('🔄 Ejecutando swap...\n');
    const result = await swap.swap(usdAmount, destAddress);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ ÉXITO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 RESULTADO:');
    console.log(`   Éxito: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT Recibido: ${result.amount}`);
    console.log(`   Tasa: 1 USDT = $${result.rate.toFixed(6)}`);
    console.log(`   Gas Fee: ${result.gasFee || 'N/A'} ETH`);
    console.log(`   Timestamp: ${result.timestamp}`);

    if (result.txHash) {
      console.log(`\n🔗 TRANSACCIÓN:`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Etherscan: ${result.explorerUrl}`);
    }

    if (result.error) {
      console.log(`\n⚠️  Error: ${result.error}`);
    }

    console.log('\n✨ ¡Swap completado exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
})();







