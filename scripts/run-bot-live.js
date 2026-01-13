#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCRIPT MAESTRO: INICIAR BOT ARBITRAJE EN TIEMPO REAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este script inicia:
 * 1. El servidor API (puerto 3100)
 * 2. El bot de arbitraje en MODO REAL
 * 3. Se conecta automáticamente con el frontend en DeFi Protocols
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - INICIADOR (MODO REAL)                        ║
║                                                                                ║
║   Este script inicia todo lo necesario para que el bot funcione:               ║
║   1. Servidor API (comunicación con frontend)                                 ║
║   2. Bot de Arbitraje (trading en vivo)                                       ║
║   3. Visualización en tiempo real en el módulo DeFi Protocols                 ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📋 Validando configuración...\n');

// Leer .env
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: archivo .env no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasPrivateKey = envContent.includes('VITE_ETH_PRIVATE_KEY');
const hasWallet = envContent.includes('VITE_ETH_WALLET_ADDRESS');

if (!hasPrivateKey || !hasWallet) {
  console.error('❌ Error: VITE_ETH_PRIVATE_KEY o VITE_ETH_WALLET_ADDRESS no están en .env');
  process.exit(1);
}

console.log('✅ .env configurado correctamente');

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR SERVIDOR API
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔧 Iniciando servidor API...\n');

const apiServer = spawn('node', [path.join(__dirname, 'defi-arb-bot.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

apiServer.on('error', (err) => {
  console.error('❌ Error iniciando servidor API:', err);
  process.exit(1);
});

// Esperar 2 segundos para que el servidor inicie
await new Promise(r => setTimeout(r, 2000));

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR BOT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Iniciando bot de arbitraje (MODO REAL)...\n');

const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

const bot = spawn('node', [botScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DRY_RUN: 'false' // FORZAR MODO LIVE
  }
});

bot.on('error', (err) => {
  console.error('❌ Error iniciando bot:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   ✅ SISTEMAS INICIADOS                                                        ║
║                                                                                ║
║   📡 API Server: http://localhost:3100                                         ║
║   🤖 Bot Status: RUNNING (LIVE MODE)                                          ║
║   🌐 Frontend: http://localhost:4000 → DeFi Protocols → Multi-Chain Arb       ║
║                                                                                ║
║   Para detener: Presiona Ctrl+C                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => {
  console.log('\n\n⏹️  Deteniendo sistemas...\n');
  
  bot.kill('SIGTERM');
  apiServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('👋 Goodbye!\n');
    process.exit(0);
  }, 1000);
});




