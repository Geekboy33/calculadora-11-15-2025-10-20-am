#!/usr/bin/env node
/**
 * Script para compilar contrato Solidity con Hardhat
 * Contornea el problema de ES Modules vs CommonJS
 */

const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('🔨 Compilando contrato USDTMinter.sol...\n');
  
  // Usar npx directamente con el archivo config
  process.env.HARDHAT_CONFIG = path.resolve(__dirname, 'hardhat.config.cjs');
  
  execSync('npx hardhat --version', { stdio: 'inherit' });
  execSync('npx hardhat compile --config hardhat.config.cjs', { stdio: 'inherit' });
  
  console.log('\n✅ ¡Compilación exitosa!\n');
} catch (error) {
  console.error('❌ Error durante compilación:', error.message);
  process.exit(1);
}









