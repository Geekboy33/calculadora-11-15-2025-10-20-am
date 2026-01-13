#!/usr/bin/env node
/**
 * 🚀 Script de Deploy de USDTMinter
 * Usa ethers.js directamente sin Hardhat
 */

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ABI compilado del contrato
const USDT_MINTER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_usdtAddress", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [{"internalType": "address", "name": "to", "internalType": "uint256", "name": "amountUSD", "type": "uint256"}],
    "name": "mintUSDT",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const USDT_MINTER_BYTECODE = require('./artifacts/server/contracts/USDTMinter.sol/USDTMinter.json').bytecode;

async function deploy() {
  console.log('🚀 Iniciando deploy de USDTMinter...\n');

  try {
    // Configuración
    const privateKey = process.env.ETH_PRIVATE_KEY;
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY';
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT en mainnet (para referencia)
    
    if (!privateKey) {
      throw new Error('❌ ETH_PRIVATE_KEY no configurada en .env');
    }

    console.log('📍 Conectando a Sepolia...');
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`   Wallet: ${wallet.address}`);
    const balance = await wallet.getBalance();
    console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    if (balance.lt(ethers.utils.parseEther('0.01'))) {
      throw new Error('❌ Balance insuficiente para deploy');
    }

    // Deploy
    console.log('⏳ Deployando contrato USDTMinter...');
    const contractFactory = new ethers.ContractFactory(
      USDT_MINTER_ABI,
      USDT_MINTER_BYTECODE,
      wallet
    );

    const contract = await contractFactory.deploy(usdtAddress);
    await contract.deployed();

    console.log('\n✅ ¡Contrato deployado!\n');
    console.log('📝 Información:\n');
    console.log(`  Dirección: ${contract.address}`);
    console.log(`  Transacción: ${contract.deployTransaction.hash}`);
    console.log(`  Red: Sepolia\n`);

    // Guardar en archivo
    const envPath = path.join(__dirname, '..', '.env.contracts');
    const content = `# USDTMinter Contract (Sepolia Testnet)
VITE_USDT_MINTER_ADDRESS=${contract.address}
VITE_USDT_MINTER_NETWORK=sepolia
VITE_USDT_MINTER_DEPLOYED_AT=${new Date().toISOString()}
`;

    fs.writeFileSync(envPath, content);
    console.log(`✅ Configuración guardada en: .env.contracts\n`);

    console.log('📚 Próximos pasos:');
    console.log('1. Copia la dirección del contrato a tu .env');
    console.log('2. Verifica en Etherscan: https://sepolia.etherscan.io/address/' + contract.address);
    console.log('3. Actualiza web3-transaction.ts con la nueva dirección\n');

    return contract.address;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deploy().then(address => {
  console.log(`✨ Dirección final: ${address}`);
  process.exit(0);
});









