/**
 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}





 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}




 * USDT Real Conversion Logic
 * Executes real USD → USDT conversion on Ethereum Mainnet
 * Using the REAL USDT ABI and transfer function
 */

import { ethers } from 'ethers';

// USDT Mainnet Contract
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_DECIMALS = 6;

// USDT Real ABI - Only the functions we need
const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Chainlink Oracle for USD/USDT price
const CHAINLINK_USD_USDT_FEED = '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D';

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

/**
 * Execute Real USD to USDT Conversion
 * @param amountUSD - Amount in USD to convert
 * @param recipientAddress - Ethereum address to receive USDT
 * @param signerPrivateKey - Private key of signer wallet with USDT
 * @param rpcUrl - Ethereum Mainnet RPC URL
 * @returns Transaction result with real blockchain data
 */
export async function executeUSDToUSDTConversion(
  amountUSD: number,
  recipientAddress: string,
  signerPrivateKey: string,
  rpcUrl: string
) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 EJECUTANDO CONVERSIÓN USD → USDT EN ETHEREUM MAINNET    🚀 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // PASO 1: Initialize provider and signer
    console.log('📍 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    const signerAddress = signer.address;
    
    console.log(`   ✅ Signer conectado: ${signerAddress}`);

    // PASO 2: Verify signer has ETH for gas
    console.log('\n📍 PASO 2: Verificando balance de ETH para gas...');
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ✅ ETH Balance: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      throw new Error(`Insufficient ETH for gas: ${ethBalanceFormatted} < 0.01`);
    }

    // PASO 3: Get USD/USDT price from Chainlink Oracle
    console.log('\n📍 PASO 3: Consultando oráculo Chainlink (USD/USDT)...');
    const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
    const roundData = await priceFeed.latestRoundData();
    const oraclePrice = parseFloat(ethers.formatUnits(roundData.answer, 8));
    
    console.log(`   ✅ Precio USD/USDT: ${oraclePrice}`);

    // PASO 4: Calculate USDT amount with 1% commission
    console.log('\n📍 PASO 4: Calculando cantidad de USDT...');
    const commissionPercent = 1;
    const calculatedUSDT = amountUSD * oraclePrice * (1 - commissionPercent / 100);
    const commission = amountUSD * oraclePrice * (commissionPercent / 100);
    
    console.log(`   Amount USD: ${amountUSD}`);
    console.log(`   Precio Oracle: ${oraclePrice}`);
    console.log(`   Comisión (1%): ${commission.toFixed(6)} USDT`);
    console.log(`   ✅ USDT a recibir: ${calculatedUSDT.toFixed(6)} USDT`);

    // PASO 5: Create USDT contract instance
    console.log('\n📍 PASO 5: Cargando contrato USDT...');
    const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    console.log(`   ✅ Contrato USDT cargado: ${USDT_ADDRESS}`);

    // PASO 6: Verify signer has sufficient USDT
    console.log('\n📍 PASO 6: Verificando balance de USDT del signer...');
    const signerUSDTBalance = await usdt.balanceOf(signerAddress);
    const signerUSDTBalanceFormatted = ethers.formatUnits(signerUSDTBalance, USDT_DECIMALS);
    
    console.log(`   ✅ USDT Balance: ${signerUSDTBalanceFormatted} USDT`);

    if (parseFloat(signerUSDTBalanceFormatted) < calculatedUSDT) {
      throw new Error(
        `Insufficient USDT: ${signerUSDTBalanceFormatted} < ${calculatedUSDT.toFixed(6)}`
      );
    }

    // PASO 7: Convert amount to wei format with USDT decimals
    console.log('\n📍 PASO 7: Preparando transfer en blockchain...');
    const amountInWei = ethers.parseUnits(calculatedUSDT.toFixed(USDT_DECIMALS), USDT_DECIMALS);
    
    console.log(`   From: ${signerAddress}`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${calculatedUSDT.toFixed(USDT_DECIMALS)} USDT`);
    console.log(`   Amount in Wei: ${amountInWei.toString()}`);

    // PASO 8: Execute transfer on blockchain
    console.log('\n📍 PASO 8: 🔥 EJECUTANDO TRANSFER REAL EN BLOCKCHAIN...');
    const tx = await usdt.transfer(recipientAddress, amountInWei, {
      gasLimit: 100000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log(`   📤 TX enviada: ${tx.hash}`);
    console.log(`   ⏳ Esperando confirmación en blockchain...\n`);

    // PASO 9: Wait for confirmation
    console.log('📍 PASO 9: Esperando confirmación en Ethereum...');
    const receipt = await tx.wait(1);

    if (!receipt) {
      throw new Error('No confirmation received from blockchain');
    }

    console.log(`   ✅ TX CONFIRMADA`);
    console.log(`   ✅ Block Number: ${receipt.blockNumber}`);
    console.log(`   ✅ Gas Used: ${receipt.gasUsed?.toString()}`);
    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);

    // PASO 10: Return result
    const etherscanUrl = `https://etherscan.io/tx/${receipt.hash}`;
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ CONVERSIÓN 100% REAL COMPLETADA CON ÉXITO ✅              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const result = {
      success: true,
      type: 'USD_USDT_BRIDGE_REAL_EXECUTED',
      network: 'Ethereum Mainnet',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status ? 'SUCCESS' : 'FAILED',
      amountUSD: amountUSD,
      amountUSDT: parseFloat(calculatedUSDT.toFixed(USDT_DECIMALS)),
      commission: parseFloat(commission.toFixed(USDT_DECIMALS)),
      oraclePrice: oraclePrice,
      signerAddress: signerAddress,
      recipientAddress: recipientAddress,
      contractAddress: USDT_ADDRESS,
      etherscanUrl: etherscanUrl,
      timestamp: new Date().toISOString(),
      real: true,
      bridge_function: 'transfer(address,uint256)',
      message: `✅ BRIDGE REAL 100% EJECUTADO: ${amountUSD} USD → ${calculatedUSDT.toFixed(6)} USDT en Ethereum Mainnet`
    };

    console.log('📊 RESULTADO:');
    console.log(`   Amount USD: ${result.amountUSD}`);
    console.log(`   Amount USDT: ${result.amountUSDT}`);
    console.log(`   Commission: ${result.commission}`);
    console.log(`   Exchange Rate: 1 USD = ${result.oraclePrice} USDT (Oracle)`);
    console.log(`   TX Hash: ${result.txHash}`);
    console.log(`   Etherscan: ${result.etherscanUrl}`);
    console.log(`   Status: ✅ REAL TRANSACTION EXECUTED\n`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN CONVERSIÓN:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      success: false,
      type: 'USD_USDT_BRIDGE_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verificar balance de USDT en una dirección
 */
export async function checkUSDTBalance(address: string, rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
  const balance = await usdt.balanceOf(address);
  return ethers.formatUnits(balance, USDT_DECIMALS);
}

/**
 * Get current USD/USDT price from Chainlink
 */
export async function getUSDUSDTPrice(rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const priceFeed = new ethers.Contract(CHAINLINK_USD_USDT_FEED, CHAINLINK_ABI, provider);
  const roundData = await priceFeed.latestRoundData();
  return parseFloat(ethers.formatUnits(roundData.answer, 8));
}






