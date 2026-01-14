import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);



import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);


import fs from 'fs';
import path from 'path';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.resolve();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

async function deploy() {
    if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY') {
        console.error('❌ Error: ETH_PRIVATE_KEY no configurada en .env');
        return;
    }
    if (!MAINNET_RPC || MAINNET_RPC.includes('YOUR_ALCHEMY_KEY')) {
        console.error('❌ Error: VITE_ETH_RPC_URL no configurada en .env');
        return;
    }

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`🚀 Desplegando USDTProxyDelegator en Ethereum Mainnet...`);
    console.log(`   - Wallet: ${signer.address}`);
    const ethBalance = ethers.formatEther(await provider.getBalance(signer.address));
    console.log(`   - Balance ETH: ${ethBalance} ETH`);

    if (parseFloat(ethBalance) < 0.01) {
        console.error('❌ Balance ETH insuficiente. Se requiere al menos 0.01 ETH.');
        return;
    }

    // Compilar contrato
    const contractPath = path.join(__dirname, 'server', 'contracts', 'USDTProxyDelegator.sol');
    const sourceCode = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'USDTProxyDelegator.sol': {
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

    console.log('📦 Compilando contrato...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error('❌ Errores de compilación:');
        output.errors.forEach(err => console.error(err.formattedMessage));
        return;
    }

    const contractOutput = output.contracts['USDTProxyDelegator.sol']['USDTProxyDelegator'];
    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    console.log('🚀 Desplegando en blockchain...');
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const deploymentOptions = {
        gasLimit: 500000,
        gasPrice: gasPrice
    };

    const contract = await factory.deploy(deploymentOptions);
    console.log(`   - TX enviada: ${contract.deploymentTransaction().hash}`);
    console.log('   - Esperando confirmación...');

    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log(`✅ USDTProxyDelegator desplegado en: ${contractAddress}`);
    console.log(`   - Etherscan: https://etherscan.io/address/${contractAddress}`);

    // Guardar info
    const deploymentInfo = {
        contractType: 'USDTProxyDelegator',
        contractAddress: contractAddress,
        deployerAddress: signer.address,
        deploymentTxHash: contract.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        network: 'Ethereum Mainnet',
        abi: abi,
        bytecode: bytecode
    };

    const deploymentInfoPath = path.join(__dirname, 'delegatorDeploymentInfo.json');
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Información guardada en ${deploymentInfoPath}`);

    // Verificar código en blockchain
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error('❌ El contrato no se deployó correctamente.');
    } else {
        console.log('✅ Código verificado en blockchain.');
    }
}

deploy().catch(console.error);





