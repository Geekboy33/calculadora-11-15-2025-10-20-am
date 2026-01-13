import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);




import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);


import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function deployRealBot() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 DESPLIEGUE - ARBITRAGE SWAP BOT REAL                  ║');
  console.log('║   Generará USDC reales que puedes retirar                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`📊 INFORMACIÓN DE DESPLIEGUE:`);
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Wallet: ${signer.address}`);
    console.log(`├─ Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // Compilar contrato
    const contractPath = path.join(process.cwd(), 'server', 'contracts', 'RealArbitrageSwapBot.sol');
    console.log(`Buscando contrato en: ${contractPath}`);
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'RealArbitrageSwapBot.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    console.log('📦 Compilando contrato RealArbitrageSwapBot...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const compilationErrors = output.errors.filter(err => err.type === 'Error');
      if (compilationErrors.length > 0) {
        console.error('❌ Errores de compilación:');
        compilationErrors.forEach(err => console.error(err.formattedMessage));
        return;
      }
    }

    const contractOutput = output.contracts['RealArbitrageSwapBot.sol']?.['RealArbitrageSwapBot'];
    
    if (!contractOutput) {
      console.error('❌ Error compilando: No se encontró el contrato');
      console.error('Available contracts:', Object.keys(output.contracts));
      return;
    }
    
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Verificar compilación
    if (!contractOutput) {
      console.error('❌ No se encontró el contrato compilado');
      return;
    }

    console.log('✅ Compilación exitosa');
    console.log('');

    // Desplegar
    console.log('🚀 Desplegando en Ethereum Mainnet...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
      gasLimit: 3000000,
      gasPrice: gasPrice
    };

    let contract;
    let receipt;
    try {
      contract = await factory.deploy(deploymentOptions);
      console.log(`├─ TX Hash: ${contract.deploymentTransaction().hash}`);
      console.log(`├─ ⏳ Esperando confirmación...`);
      receipt = await contract.deploymentTransaction().wait(1);
      console.log(`├─ ✅ Confirmada en bloque: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`❌ Error en despliegue:`, error.message);
      return;
    }

    const botAddress = await contract.getAddress();
    console.log(`├─ Dirección del Bot: ${botAddress}`);
    console.log(`└─ Etherscan: https://etherscan.io/address/${botAddress}`);
    console.log('');

    // Guardar información
    const deploymentInfo = {
      contractAddress: botAddress,
      deployerAddress: signer.address,
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      type: 'RealArbitrageSwapBot',
      abi: abi,
      deploymentTx: receipt.hash
    };

    const deploymentInfoPath = path.join(__dirname, 'realBotDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 PRÓXIMO PASO: DEPOSITAR USDC EN EL BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verificar balance USDC
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log(`Tu balance USDC actual: ${usdcFormatted} USDC`);
    console.log('');

    if (parseFloat(usdcFormatted) < 100) {
      console.log('⚠️  NECESITAS AL MENOS 100 USDC PARA HACER PRUEBAS');
      console.log('');
      console.log('Para obtener USDC:');
      console.log('1. Compra en Coinbase, Kraken o Binance');
      console.log('2. Envía a tu wallet: ' + signer.address);
      console.log('3. Luego ejecuta: node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    } else {
      console.log('✅ Tienes suficiente USDC para hacer arbitraje');
      console.log('');
      console.log('Próximo paso:');
      console.log('node server/scripts/depositAndExecuteArbitrage.js');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ BOT REAL DESPLEGADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log(`📝 Información guardada: realBotDeploymentInfo.json`);
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

deployRealBot().catch(console.error);

