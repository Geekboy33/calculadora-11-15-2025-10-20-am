/**
 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);



 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);


 * USDT Minter - Script para Emitir Más Tokens USDT
 * 
 * Usa un contrato intermedio para llamar a la función issue() del contrato USDT real
 * en Ethereum Mainnet.
 * 
 * Instalación:
 * npm install web3 ethers
 * 
 * Uso:
 * node blockchain/scripts/createMoreTokens.js
 */

const ethers = require('ethers');
require('dotenv').config();

// Configuración
const CONFIG = {
  // Red: Ethereum Mainnet
  RPC_URL: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
  
  // Clave privada del propietario (NUNCA compartir)
  PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036',
  
  // Dirección del contrato USDT real
  USDT_ADDRESS: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  
  // Dirección del contrato USDTMinter (intermediario)
  // NOTA: Reemplaza con la dirección donde deployed el contrato
  USDT_MINTER_ADDRESS: process.env.USDT_MINTER_ADDRESS || '0x...',
  
  // Cantidad de USDT a emitir (en unidades, sin decimales)
  AMOUNT_TO_ISSUE: 1000, // 1000 USDT
  
  // Razón de la emisión (para auditoría)
  REASON: 'Development testing - Token issuance for bridge'
};

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20 estándar)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function createMoreTokens() {
  console.log('\n🚀 USDT MINTER - Iniciando emisión de tokens USDT\n');
  console.log('⚙️ Configuración:');
  console.log(`  RPC: ${CONFIG.RPC_URL.substring(0, 50)}...`);
  console.log(`  USDT Minter: ${CONFIG.USDT_MINTER_ADDRESS}`);
  console.log(`  USDT Real: ${CONFIG.USDT_ADDRESS}`);
  console.log(`  Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
  console.log(`  Razón: ${CONFIG.REASON}\n`);

  try {
    // ✅ PASO 1: Conectar al provider
    console.log('📡 PASO 1: Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    console.log('✅ Conectado al RPC');

    // ✅ PASO 2: Crear signer (propietario)
    console.log('\n🔑 PASO 2: Creando signer (propietario)...');
    const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    const signerAddress = signer.address;
    console.log(`✅ Signer: ${signerAddress}`);

    // Verificar balance ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`💰 Balance ETH: ${ethBalanceFormatted} ETH`);

    if (parseFloat(ethBalanceFormatted) < 0.01) {
      console.error(`❌ Balance ETH insuficiente: ${ethBalanceFormatted} ETH < 0.01 ETH requerido`);
      process.exit(1);
    }

    // ✅ PASO 3: Conectar al contrato USDTMinter
    console.log('\n📋 PASO 3: Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(CONFIG.USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    console.log(`✅ Contrato USDTMinter cargado: ${CONFIG.USDT_MINTER_ADDRESS}`);

    // Obtener balance USDT actual en el contrato minter
    console.log('\n📊 PASO 4: Verificando balances actuales...');
    const usdtContract = new ethers.Contract(CONFIG.USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const minterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();
    
    const minterUsdtFormatted = ethers.formatUnits(minterUsdtBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);
    
    console.log(`✅ Decimales USDT: ${decimals}`);
    console.log(`💵 Balance USDT en Minter: ${minterUsdtFormatted} USDT`);
    console.log(`📈 Supply Total USDT: ${totalSupplyFormatted} USDT`);

    // ✅ PASO 5: Convertir cantidad a wei (con decimales)
    console.log('\n🔢 PASO 5: Preparando cantidad de USDT...');
    const amountInWei = ethers.parseUnits(CONFIG.AMOUNT_TO_ISSUE.toString(), decimals);
    console.log(`✅ Cantidad: ${CONFIG.AMOUNT_TO_ISSUE} USDT = ${amountInWei.toString()} wei`);

    // ✅ PASO 6: Ejecutar función issueUSDT
    console.log('\n⚡ PASO 6: Ejecutando issueUSDT() en el contrato intermediario...');
    console.log(`📤 Llamando issueUSDT(${amountInWei.toString()}, "${CONFIG.REASON}")`);

    const tx = await minterContract.issueUSDT(
      amountInWei,
      CONFIG.REASON,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('25', 'gwei')
      }
    );

    console.log(`📋 TX Hash: ${tx.hash}`);
    console.log('⏳ Esperando confirmación en blockchain...');

    // ✅ PASO 7: Esperar confirmación
    const receipt = await tx.wait(1);
    
    console.log(`✅ Transacción confirmada en bloque #${receipt.blockNumber}`);
    console.log(`📊 Gas usado: ${receipt.gasUsed.toString()} wei`);
    console.log(`⚙️ Status: ${receipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED'}`);

    // ✅ PASO 8: Verificar resultados
    console.log('\n✨ PASO 8: Verificando resultados...');
    
    const newMinterUsdtBalance = await usdtContract.balanceOf(CONFIG.USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();
    
    const newMinterUsdtFormatted = ethers.formatUnits(newMinterUsdtBalance, decimals);
    const newTotalSupplyFormatted = ethers.formatUnits(newTotalSupply, decimals);
    
    console.log(`💵 Nuevo balance USDT en Minter: ${newMinterUsdtFormatted} USDT`);
    console.log(`📈 Nuevo Supply Total USDT: ${newTotalSupplyFormatted} USDT`);
    console.log(`➕ USDT emitidos: ${(parseFloat(newMinterUsdtFormatted) - parseFloat(minterUsdtFormatted)).toFixed(decimals)} USDT`);

    // ✅ RESUMEN
    console.log('\n✅ ===== EMISSION SUCCESSFUL =====');
    console.log('Resumen de la transacción:');
    console.log(`  TX Hash: ${receipt.hash}`);
    console.log(`  Bloque: #${receipt.blockNumber}`);
    console.log(`  USDT emitidos: ${CONFIG.AMOUNT_TO_ISSUE} USDT`);
    console.log(`  Etherscan: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`  Total Supply (actualizado): ${newTotalSupplyFormatted} USDT`);
    console.log('==================================\n');

  } catch (error) {
    console.error('❌ Error durante la emisión:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    
    if (error.reason) console.error('Razón:', error.reason);
    if (error.code) console.error('Código:', error.code);
    if (error.transaction) console.error('TX Data:', error.transaction);
    
    process.exit(1);
  }
}

// Ejecutar
createMoreTokens().catch(console.error);





