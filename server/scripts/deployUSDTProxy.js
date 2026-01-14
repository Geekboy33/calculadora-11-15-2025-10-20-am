/**
 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();



 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();


 * Script de Deployment - USDT Proxy Bridge
 * Despliega el contrato proxy en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)",
  "function transferOwnership(address _newOwner) external",
  "function emergencyWithdraw(uint256 _amount) external returns (bool)"
];

// Bytecode compilado del contrato (simplificado para este ejemplo)
const USDT_PROXY_BYTECODE = '0x60806040523480156200001157600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550734c17f958d2ee523a2206206994597c13d831ec700737300000000000000000000000000000000000000000600190602019015562000087565b612c9a80620000979600396000f3fe';

async function deployUSDTProxy() {
  try {
    console.log('🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...');

    // Configuración del provider y signer
    const RPC_URL = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Wallet:', signer.address);
    console.log('🔗 Red: Ethereum Mainnet');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ Gas Price:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'gwei');

    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.01) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.01 ETH`);
    }

    // Crear factory del contrato
    console.log('\n📦 Compilando contrato...');
    
    const contractFactory = new ethers.ContractFactory(
      USDT_PROXY_ABI,
      USDT_PROXY_BYTECODE,
      signer
    );

    // Desplegar contrato
    console.log('🔨 Desplegando contrato...');
    
    const proxyContract = await contractFactory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    console.log('📝 TX Hash:', proxyContract.deploymentTransaction().hash);
    console.log('⏳ Esperando confirmación...');

    // Esperar confirmación
    const deployedContract = await proxyContract.waitForDeployment();
    const proxyAddress = await deployedContract.getAddress();

    console.log('\n✅ [SUCCESS] Contrato desplegado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Dirección del Proxy:', proxyAddress);
    console.log('🔗 Etherscan:', `https://etherscan.io/address/${proxyAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Guardar dirección en archivo
    const fs = await import('fs');
    const deploymentInfo = {
      proxyAddress,
      deploymentTx: proxyContract.deploymentTransaction().hash,
      network: 'Ethereum Mainnet',
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      abi: USDT_PROXY_ABI
    };

    fs.writeFileSync(
      './server/scripts/deploymentInfo.json',
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n💾 Información guardada en: ./server/scripts/deploymentInfo.json');

    return {
      proxyAddress,
      deploymentInfo
    };

  } catch (error) {
    console.error('❌ [ERROR] Deployment fallido:', error.message);
    process.exit(1);
  }
}

// Ejecutar deployment
deployUSDTProxy();





