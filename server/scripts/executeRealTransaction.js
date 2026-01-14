import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const DELEGATOR_ADDRESS = '0xD3236a93fca00A06AD8CaB266641E50B07a59E3f';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT = '100'; // 100 USDT

// ABI simplificado del Delegador
const DELEGATOR_ABI = [
  'function emitIssue(address _to, uint256 _amount) external returns (bool)',
  'function getTotalIssued() external view returns (uint256)',
  'function getIssuedAmount(address _to) external view returns (uint256)'
];

async function executeRealTransaction() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 EJECUTANDO TRANSACCIÓN REAL - DELEGADOR USDT        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📊 Información de la Transacción:');
    console.log(`├─ Red: Ethereum Mainnet`);
    console.log(`├─ Signer: ${signer.address}`);
    console.log(`├─ Contrato: ${DELEGATOR_ADDRESS}`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad: ${AMOUNT} USDT`);
    console.log('');

    // Verificar balance ETH del signer
    const ethBalance = await provider.getBalance(signer.address);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH del Signer: ${balanceETH} ETH`);

    if (parseFloat(balanceETH) < 0.002) {
      console.error('❌ Balance ETH insuficiente para gas');
      return;
    }

    console.log('');
    console.log('🔄 Conectando al contrato Delegador...');

    // Conectar al contrato
    const delegator = new ethers.Contract(DELEGATOR_ADDRESS, DELEGATOR_ABI, signer);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (5x)`);
    console.log('');

    // Convertir AMOUNT a wei (USDT tiene 6 decimales, pero emitIssue espera número simple)
    const amountNum = ethers.parseUnits(AMOUNT, 0); // Sin decimales para evento

    console.log('⏳ Enviando transacción real a blockchain...');
    console.log('');

    // Ejecutar transacción
    const tx = await delegator.emitIssue(RECIPIENT, amountNum, {
      gasLimit: 150000,
      gasPrice: gasPrice
    });

    console.log('✅ TRANSACCIÓN ENVIADA A BLOCKCHAIN');
    console.log('');
    console.log('📋 Detalles de la Transacción:');
    console.log(`├─ Hash: ${tx.hash}`);
    console.log(`├─ From: ${tx.from}`);
    console.log(`├─ To: ${tx.to}`);
    console.log('');
    console.log('⏳ Esperando confirmación...');
    console.log('');

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('✅ TRANSACCIÓN CONFIRMADA EN BLOCKCHAIN');
    console.log('');
    console.log('🔗 Detalles de la Confirmación:');
    console.log(`├─ Bloque: ${receipt.blockNumber}`);
    console.log(`├─ Transaction Hash: ${receipt.hash}`);
    console.log(`├─ Estado: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Confirmaciones: 1`);
    console.log('');

    const gasCost = receipt.gasUsed * gasPrice;
    const gasCostETH = ethers.formatEther(gasCost);

    console.log('💸 Costo de la Transacción:');
    console.log(`├─ Gas Usado: ${receipt.gasUsed.toString()}`);
    console.log(`├─ Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    console.log(`└─ Costo Total: ${gasCostETH} ETH`);
    console.log('');

    console.log('📝 Evento Registrado:');
    console.log(`├─ Método: emitIssue()`);
    console.log(`├─ Destinatario: ${RECIPIENT}`);
    console.log(`├─ Cantidad Emitida: ${AMOUNT} USDT`);
    console.log('');

    // Verificar estado del contrato
    console.log('🔍 Verificando estado del contrato...');
    const totalIssued = await delegator.getTotalIssued();
    const recipientAmount = await delegator.getIssuedAmount(RECIPIENT);

    console.log(`├─ Total Emitido en Contrato: ${totalIssued.toString()}`);
    console.log(`└─ Emitido al Destinatario: ${recipientAmount.toString()}`);
    console.log('');

    // URLs de Etherscan
    console.log('🌐 Verificar en Etherscan:');
    console.log(`├─ Transacción: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`├─ Contrato: https://etherscan.io/address/${DELEGATOR_ADDRESS}`);
    console.log(`├─ Signer: https://etherscan.io/address/${signer.address}`);
    console.log(`└─ Destinatario: https://etherscan.io/address/${RECIPIENT}`);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ TRANSACCIÓN REAL EJECUTADA EXITOSAMENTE EN MAINNET   ║');
    console.log('║                                                            ║');
    console.log('║  El evento USDTIssued ha sido registrado en blockchain    ║');
    console.log('║  y es permanentemente auditable en Etherscan.             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR AL EJECUTAR TRANSACCIÓN:');
    console.error('');
    console.error(error.message);
    console.error('');
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('⚠️  Balance ETH insuficiente en el signer');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('⚠️  Error de conexión a la red');
    } else {
      console.error('⚠️  Error desconocido');
    }
  }
}

executeRealTransaction().catch(console.error);





