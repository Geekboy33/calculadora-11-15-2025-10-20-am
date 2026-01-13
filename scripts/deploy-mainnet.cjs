const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ABI del contrato compilado
const contractABI = [
  {
    inputs: [{ internalType: 'address', name: '_usdtAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amountUSD', type: 'uint256' }
    ],
    name: 'mintUSDT',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'transferUSDT',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getContractUSDTBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'USDTMinted',
    type: 'event'
  }
];

// Bytecode del contrato (será cargado desde artifacts)
let contractBytecode;

async function deploy() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       🚀 DEPLOYANDO USDT MINTER EN MAINNET REAL           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT en Mainnet

    if (!privateKey) {
      throw new Error('❌ ETH_PRIVATE_KEY no configurada');
    }

    console.log('📍 Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    let key = privateKey.trim();
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }

    const wallet = new ethers.Wallet(key, provider);
    
    console.log('✅ Wallet:', wallet.address);

    // Verificar balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance:', balanceEth, 'ETH');

    // Cargar bytecode
    console.log('\n📦 Cargando bytecode compilado...');
    let bytecode;
    try {
      const artifactPath = path.join(__dirname, '../artifacts/server/contracts/USDTMinter.sol/USDTMinter.json');
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      bytecode = artifact.bytecode;
      console.log('✅ Bytecode cargado');
    } catch (e) {
      console.log('⚠️  Usando bytecode alternativo...');
      bytecode = require('./usdtminter-bytecode.json').bytecode;
    }

    // Crear factory
    console.log('\n🔨 Preparando deployer...');
    const factory = new ethers.ContractFactory(contractABI, bytecode, wallet);

    // Deploy
    console.log('⏳ Deployando contrato en Mainnet...');
    console.log('   USDT Address:', USDT_ADDRESS);
    console.log('   Aguarda confirmación...\n');

    const contract = await factory.deploy(USDT_ADDRESS);

    console.log('📤 Transacción enviada');
    console.log('   TX Hash:', contract.deploymentTransaction().hash);
    console.log('   Esperando confirmaciones...\n');

    // Esperar deploy
    const receipt = await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ✅ ¡DEPLOY EXITOSO EN MAINNET!                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles del Deploy:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dirección Contrato:', deployedAddress);
    console.log('Transacción Hash:', contract.deploymentTransaction().hash);
    console.log('Red: Ethereum Mainnet (Chain ID: 1)');
    console.log('USDT Address:', USDT_ADDRESS);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Guardar configuración
    console.log('💾 Guardando configuración...');
    const envPath = path.join(__dirname, '../.env.mainnet');
    const content = `# USDTMinter Contract - Mainnet Deployment
VITE_USDT_MINTER_ADDRESS=${deployedAddress}
VITE_USDT_MINTER_NETWORK=mainnet
VITE_USDT_MINTER_DEPLOYED_AT=${new Date().toISOString()}
VITE_USDT_MINTER_TX_HASH=${contract.deploymentTransaction().hash}
VITE_USDT_ADDRESS=${USDT_ADDRESS}
`;

    fs.writeFileSync(envPath, content);
    console.log('✅ Configuración guardada en: .env.mainnet\n');

    // Mostrar próximos pasos
    console.log('📝 Próximos Pasos:');
    console.log('1. Copia la dirección del contrato');
    console.log('2. Actualiza web3-transaction.ts:');
    console.log(`   const USDT_CONTRACT = "${deployedAddress}";`);
    console.log('3. Verifica en Etherscan:');
    console.log(`   https://etherscan.io/address/${deployedAddress}`);
    console.log('4. Prueba en tu aplicación\n');

    console.log('✨ ¡DEPLOYMENT COMPLETADO EXITOSAMENTE! 🎉\n');

    return deployedAddress;

  } catch (error) {
    console.error('\n❌ ERROR EN DEPLOY:');
    console.error('   ', error.message);
    console.error('\n⚠️  Si el error es sobre bytecode, asegúrate de:');
    console.error('   1. Compilar: npx hardhat compile --config hardhat.config.cjs');
    console.error('   2. El archivo artifacts/ existe\n');
    process.exit(1);
  }
}

deploy().then(address => {
  console.log(`🎯 Dirección Final: ${address}`);
  process.exit(0);
});









