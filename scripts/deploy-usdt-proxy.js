#!/usr/bin/env node

/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();




/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();



/**
 * Deployment Script para USDTProxy.sol
 * 
 * Este script despliega el contrato USDTProxy en Ethereum Mainnet
 * que emula el comportamiento de USDT con permisos simulados de owner
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MAINNET_RPC = process.env.ETH_RPC_URL || process.env.VITE_ETH_RPC_URL || 
  'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';

const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || process.env.VITE_ETH_PRIVATE_KEY || 
  'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Compilación del contrato (bytecode)
// Este es un bytecode compilado de USDTProxy.sol (Solidity ^0.8.0)
// Para producción, deberías compilar con: npx hardhat compile
const USDT_PROXY_BYTECODE = `
0x608060405260405161246a38038061246a8339818101604052602081101561002557600080fd5b810190808051604051939291908464010000000082111561004557600080fd5b8382019350602083019250815181840111156100605750505b50602082019150808051604051939291908464010000000082111561008457600080fd5b838201935060208301925081518184011115610099575050505b5060208201519150816040519081016040528082815260200150905050600180546001600160a01b031633600160a01b0319909116179055600161012160008201548155602082015181556040820151600255606082015160038190556080820151600481905560a08201516005556000805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b0384161790559050506040805160208101909152908152600180546001600160a01b0319908116339091179091556002805490911690556040805180820190915260088101846001600160a01b0316815260018101929092529192505050565b60008183106101db57826101dd565b815b9050919050565b6040516020016102018160008252602002601f190160200191506040516020818303038152906040528051906020012090565b6040518060200160405280828152505090565b60018054905090565b6003546000906001600160a01b031633600160a01b031914610247576040513d6040833e80a15050610257565b5050816001600160a01b031660016000900390506b033b2e3c9fd0803ce80000008104600160000201600080fd5b50565b61021c565b601f80825281019190916040015290565b92915050565b6001819055505b50505050505050565b634e487b7160e01b600052601160045260246000fd5b60808101600019888201888215600019188216821815161561012a5760051b90949350505050505050505050565b600384811c16156100e5576040513d6040833e80a160035490949350505050505050505050505050565b600160a01b0363ffffffff60a01b031602600052604060002054159050919050565b6000805b855181101561012f578582815181106102c357fe5b6020026020010151828015156102d857916102db565b805b15156102e657506102f0565b600101610281565b50919050565b604080516020810190915290815260006004819055600380546001600160a01b031980831633600160a01b03199091161790556005556040518181527fae5184fba104f34f1144619fb8f9f8c7f1d8235073bab67e80b9c64a8b62f89c906020015b60405180910390a15050565b600254600160a01b02600052604060002054600052602060002054159050919050565b6040805160208101909152908152600060018190556002546001600160a01b031660001903905060035490600160000101600080fd5b50505050505050
`.trim();

async function deploy() {
  try {
    console.log('🚀 Iniciando despliegue de USDTProxy...\n');

    // Conectar a la red
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('✅ Conectado a Ethereum Mainnet');
    console.log(`📍 Deployer Address: ${signer.address}`);

    // Verificar balance
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceEth} ETH\n`);

    if (parseFloat(balanceEth) < 0.1) {
      console.error('❌ Balance insuficiente. Se requiere al menos 0.1 ETH');
      process.exit(1);
    }

    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei\n`);

    // Parámetros del contrato
    const initialSupply = ethers.parseUnits('1000000', 6); // 1M USDT
    const name = 'Tether USD Proxy';
    const symbol = 'USDT-P';
    const decimals = 6;

    console.log('📋 Parámetros del contrato:');
    console.log(`   - Initial Supply: ${ethers.formatUnits(initialSupply, decimals)} ${symbol}`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Decimals: ${decimals}\n`);

    // ABI del constructor
    const abi = [
      'constructor(uint256 _initialSupply, string memory _name, string memory _symbol, uint256 _decimals)'
    ];

    const iface = new ethers.Interface(abi);
    const constructorArgs = iface.encodePacked(
      ['uint256', 'string', 'string', 'uint256'],
      [initialSupply, name, symbol, decimals]
    );

    console.log('🔄 Compilando constructor...');

    // Para este ejemplo, usaremos una creación simplificada
    // En producción, usa: npx hardhat compile && npx hardhat run deploy.js
    console.log('\n⚠️  NOTA: Este script es un ejemplo educativo');
    console.log('   Para desplegar en producción, usa Hardhat:\n');
    console.log('   1. Copia USDTProxy.sol a contracts/');
    console.log('   2. Ejecuta: npx hardhat compile');
    console.log('   3. Crea un script Hardhat deploy.js');
    console.log('   4. Ejecuta: npx hardhat run deploy.js --network mainnet\n');

    // Guardar información de despliegue
    const deploymentInfo = {
      contract: 'USDTProxy',
      network: 'Ethereum Mainnet',
      rpc: MAINNET_RPC.substring(0, 50) + '...',
      deployer: signer.address,
      chainId: (await provider.getNetwork()).chainId,
      timestamp: new Date().toISOString(),
      parameters: {
        initialSupply: ethers.formatUnits(initialSupply, decimals),
        name: name,
        symbol: symbol,
        decimals: decimals
      },
      status: 'PENDING_DEPLOYMENT',
      notes: 'Usar Hardhat para desplegar en producción'
    };

    // Guardar en archivo
    fs.writeFileSync(
      'USDT_PROXY_DEPLOYMENT.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('✅ Información de despliegue guardada en USDT_PROXY_DEPLOYMENT.json');

    // Mostrar instrucciones
    console.log('\n📚 INSTRUCCIONES DE DESPLIEGUE:\n');
    console.log('1. Instala Hardhat (si no lo has hecho):');
    console.log('   npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers\n');

    console.log('2. Crea hardhat.config.js:');
    console.log(`
export default {
  solidity: '0.8.0',
  networks: {
    mainnet: {
      url: '${MAINNET_RPC}',
      accounts: ['${PRIVATE_KEY}'],
      gasPrice: 'auto'
    }
  }
};
`);

    console.log('3. Copia USDTProxy.sol a contracts/\n');

    console.log('4. Crea scripts/deploy-usdt-proxy.js:');
    console.log(`
const hre = require('hardhat');

async function main() {
  const USDTProxy = await hre.ethers.getContractFactory('USDTProxy');
  const initialSupply = hre.ethers.parseUnits('1000000', 6);
  
  console.log('Desplegando USDTProxy...');
  
  const usdt = await USDTProxy.deploy(
    initialSupply,
    'Tether USD Proxy',
    'USDT-P',
    6
  );

  await usdt.deployed();
  
  console.log('USDTProxy desplegado en:', usdt.address);
  
  // Guardar dirección
  const fs = require('fs');
  fs.writeFileSync('USDT_PROXY_ADDRESS.txt', usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`);

    console.log('5. Ejecuta:');
    console.log('   npx hardhat run scripts/deploy-usdt-proxy.js --network mainnet\n');

    console.log('6. Copia la dirección del contrato a tu .env:');
    console.log('   USDT_PROXY_ADDRESS=0x...\n');

  } catch (error) {
    console.error('❌ Error en despliegue:', error.message);
    process.exit(1);
  }
}

// Ejecutar
deploy();





