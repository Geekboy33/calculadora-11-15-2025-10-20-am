/**
 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}



 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}


 * Depositar USDT en Bridge Emitter para poder emitir después
 * Esto resuelve el problema: el contrato necesita tener USDT para transferir
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

const BRIDGE_ABI = [
  "function receiveUSDT(uint256 _amount) external",
  "function getContractBalance() external view returns (uint256)",
  "function emitViaApprove(address _to, uint256 _amount) external returns (bool)",
  "function simulatedIssue(address _to, uint256 _amount) external returns (bool)"
];

async function depositUSDTToBridge(bridgeAddress, amountToDeposit) {
  try {
    console.log('🌉 [DEPOSIT] Depositando USDT en Bridge Emitter...\n');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📍 Signer:', signer.address);
    console.log('🌉 Bridge Contract:', bridgeAddress);
    console.log('💰 Cantidad a depositar:', amountToDeposit, 'USDT\n');

    // Conectar a USDT
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

    // Obtener decimales
    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountToDeposit.toString(), decimals);

    console.log('⛽ Obteniendo gas price...');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5); // 5x
    console.log('📊 Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    // PASO 1: Verificar balance actual
    console.log('1️⃣ Verificando balance de USDT...');
    const balance = await usdtContract.balanceOf(signer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('   ✅ Balance:', balanceFormatted, 'USDT');

    if (balance < amountInWei) {
        throw new Error(`Balance insuficiente: ${balanceFormatted} < ${amountToDeposit}`);
    }

    // PASO 2: Aprobar transferencia al bridge
    console.log('\n2️⃣ Aprobando transferencia al bridge...');
    const approveTx = await usdtContract.approve(bridgeAddress, amountInWei, {
        gasLimit: 100000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Approve:', approveTx.hash);
    
    const approveReceipt = await approveTx.wait(1);
    console.log('   ✅ Aprobado:', approveReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 3: Transferir USDT al bridge
    console.log('\n3️⃣ Transfiriendo USDT al bridge...');
    const bridgeContract = new ethers.Contract(bridgeAddress, BRIDGE_ABI, signer);
    
    const depositTx = await bridgeContract.receiveUSDT(amountInWei, {
        gasLimit: 200000,
        gasPrice: gasPrice
    });
    console.log('   📝 TX Deposit:', depositTx.hash);
    
    const depositReceipt = await depositTx.wait(1);
    console.log('   ✅ Depositado:', depositReceipt.status === 1 ? 'Success' : 'Failed');

    // PASO 4: Verificar balance en el bridge
    console.log('\n4️⃣ Verificando balance en el bridge...');
    const bridgeBalance = await bridgeContract.getContractBalance();
    const bridgeBalanceFormatted = ethers.formatUnits(bridgeBalance, decimals);
    console.log('   ✅ Balance del Bridge:', bridgeBalanceFormatted, 'USDT');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPOSITO COMPLETADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Resumen:');
    console.log('   - USDT Depositado:', amountToDeposit);
    console.log('   - En Bridge:', bridgeBalanceFormatted);
    console.log('   - Dirección:', bridgeAddress);
    console.log('\n💡 Ahora el bridge puede emitir USDT!\n');

    return {
        success: true,
        depositTx: depositTx.hash,
        bridgeBalance: bridgeBalanceFormatted
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se proporciona dirección del bridge
if (process.argv[2]) {
    const bridgeAddress = process.argv[2];
    const amountToDeposit = process.argv[3] || 100;
    depositUSDTToBridge(bridgeAddress, parseFloat(amountToDeposit));
} else {
    console.error('❌ Uso: node depositUSDTToBridge.js <bridgeAddress> [amount]');
    console.error('Ejemplo: node depositUSDTToBridge.js 0x... 100');
    process.exit(1);
}




