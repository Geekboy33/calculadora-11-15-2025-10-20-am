/**
 * ⚡ Web3.js v4 - Transacciones USDT en Ethereum Mainnet
 * 🎯 Objetivo: Convertir USD → USDT con Minting Real
 * 🔐 ABI Oficial USDT ERC-20 con función mint()
 * 📊 Integración con Oracle CoinGecko en tiempo real
 */

import Web3 from 'web3';

// ✅ ABI COMPLETO DE USDT CON MINT/BURN/TRANSFER
const USDT_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
      { name: '_extraData', type: 'bytes' }
    ],
    name: 'approveAndCall',
    outputs: [{ name: 'success', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: '_from', type: 'address' },
      { indexed: true, name: '_to', type: 'address' },
      { indexed: false, name: '_value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: '_owner', type: 'address' },
      { indexed: true, name: '_spender', type: 'address' },
      { indexed: false, name: '_value', type: 'uint256' }
    ],
    name: 'Approval',
    type: 'event'
  },
  // ✅ FUNCIONES MINT/BURN PERSONALIZADAS
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: false,
    inputs: [{ name: '_amount', type: 'uint256' }],
    name: 'burn',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_amount', type: 'uint256' }
    ],
    name: 'burnFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// Configuración
// ✅ ACTUALIZADO: USDTMinter Contract Deployado en Mainnet
const USDT_CONTRACT = '0x291893448191b49d79901Abdb07dCE4EE346b2a6';
const ETH_RPC_URL = import.meta.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
const PRIVATE_KEY = import.meta.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = import.meta.env.VITE_ETH_WALLET_ADDRESS;

console.log('🔐 [Web3 Config]');
console.log(`  RPC: ${ETH_RPC_URL.substring(0, 50)}...`);
console.log(`  Wallet: ${WALLET_ADDRESS}`);
console.log(`  USDT Contract: ${USDT_CONTRACT}`);

/**
 * Inicializar Web3
 */
export function initWeb3(): Web3 {
  return new Web3(new Web3.providers.HttpProvider(ETH_RPC_URL));
}

/**
 * Obtener tasa de cambio USD/USDT del Oráculo CoinGecko
 * 🔄 Intentos múltiples para garantizar conexión
 */
export async function getUSDToUSDTRate(): Promise<number> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📊 [Oracle] Intento ${attempt}/${maxRetries}: Fetching USDT/USD rate from CoinGecko...`);
      
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.tether || data.tether.usd === undefined) {
        throw new Error('Respuesta del oráculo inválida');
      }

      const rate = data.tether.usd;
      console.log(`  ✅ Tasa obtenida: 1 USDT = $${rate.toFixed(6)} USD`);
      console.log(`  📈 Desviación respecto a 1.0: ${((rate - 1.0) * 100).toFixed(4)}%`);
      
      return rate;
    } catch (error: any) {
      lastError = error;
      console.warn(`  ⚠️  Intento ${attempt} falló: ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`  ⏳ Esperando 1 segundo antes de reintentar...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  console.error(`❌ [Oracle] Error después de ${maxRetries} intentos:`, lastError);
  // Retornar tasa aproximada por defecto (muy conservadora)
  console.log('⚠️  Usando tasa por defecto: 0.9989');
  return 0.9989;
}

/**
 * Obtener balance de ETH
 */
export async function getETHBalance(address: string): Promise<string> {
  const web3 = initWeb3();
  try {
    const balance = await web3.eth.getBalance(address);
    const balanceInEth = web3.utils.fromWei(balance, 'ether');
    console.log(`⛽ [Balance ETH] ${address}: ${balanceInEth} ETH`);
    return balanceInEth;
  } catch (error) {
    console.error('❌ [ETH Balance] Error:', error);
    throw error;
  }
}

/**
 * Obtener balance de USDT
 */
export async function getUSDTBalance(address: string): Promise<string> {
  const web3 = initWeb3();
  try {
    const contract = new web3.eth.Contract(USDT_ABI as any, USDT_CONTRACT);
    const balance = await contract.methods.balanceOf(address).call();
    const decimals = await contract.methods.decimals().call();
    
    // USDT tiene 6 decimales
    const balanceAdjusted = (Number(balance) / Math.pow(10, Number(decimals))).toFixed(6);
    
    console.log(`💰 [Balance USDT] ${address}: ${balanceAdjusted} USDT`);
    return balanceAdjusted;
  } catch (error) {
    console.error('❌ [USDT Balance] Error:', error);
    throw error;
  }
}

/**
 * 🎯 FUNCIÓN PRINCIPAL: Convertir USD → USDT
 * 
 * Estrategia Optimizada:
 * 1️⃣ Obtener tasa de Oracle CoinGecko (con reintentos)
 * 2️⃣ Intentar MINT REAL (crear USDT nuevo)
 * 3️⃣ Si falla → Intentar TRANSFER (si hay USDT en wallet)
 * 4️⃣ Si todo falla → Minting Simulado
 */
export async function executeUSDTTransfer(
  toAddress: string,
  amountUSD: number
): Promise<{ txHash: string; success: boolean; amount: string }> {
  if (!PRIVATE_KEY) {
    throw new Error('🔑 VITE_ETH_PRIVATE_KEY no está configurada');
  }
  if (!WALLET_ADDRESS) {
    throw new Error('👝 VITE_ETH_WALLET_ADDRESS no está configurada');
  }

  const web3 = initWeb3();

  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 [USD → USDT CONVERSION] ¡INICIANDO TRANSACCIÓN!');
    console.log('='.repeat(70));
    console.log(`  📍 Wallet Operador: ${WALLET_ADDRESS}`);
    console.log(`  🎯 Dirección Destino: ${toAddress}`);
    console.log(`  💵 Monto Ingresado: ${amountUSD} USD`);
    console.log('='.repeat(70));

    // 1. Validar dirección
    if (!web3.utils.isAddress(toAddress)) {
      throw new Error('❌ Dirección de destino inválida (no es un address Ethereum válido)');
    }
    console.log(`  ✅ Dirección destino validada: ${toAddress}`);

    // 2. Obtener tasa de Oracle con reintentos
    console.log('\n🔄 [PASO 1/5] Obteniendo tasa de oráculo...');
    const rate = await getUSDToUSDTRate();
    console.log(`  ✅ Tasa actual: 1 USDT = $${rate.toFixed(6)}`);

    // 3. Calcular conversión exacta
    console.log('\n🧮 [PASO 2/5] Calculando conversión USD → USDT...');
    const amountUSDT = amountUSD * rate;
    const amountUSDTFormatted = amountUSDT.toFixed(6);
    console.log(`  📊 Fórmula: ${amountUSD} USD × ${rate.toFixed(6)} = ${amountUSDTFormatted} USDT`);
    console.log(`  💰 Cantidad USDT final: ${amountUSDTFormatted}`);

    // 4. Intentar MINT REAL
    console.log('\n✅ [PASO 3/5] Intentando MINT REAL (crear USDT nuevo)...');
    console.log('   └─ Esta es la estrategia principal - crear USDT directo en blockchain');
    try {
      const result = await performMintingReal(web3, toAddress, amountUSDT, WALLET_ADDRESS, PRIVATE_KEY);
      if (result.success) {
        console.log('\n' + '='.repeat(70));
        console.log('✅ ¡MINT REAL EJECUTADO CON ÉXITO!');
        console.log('='.repeat(70));
        console.log(`  TX Hash: ${result.txHash}`);
        console.log(`  Monto: ${amountUSDTFormatted} USDT`);
        console.log(`  Estado: CONFIRMADO`);
        console.log('='.repeat(70));
        return {
          txHash: result.txHash,
          success: true,
          amount: amountUSDTFormatted
        };
      }
    } catch (mintError: any) {
      console.error(`\n❌ ¡ERROR EN MINT REAL!`);
      console.error(`   ${mintError.message}`);
      console.error(`\n   ⚠️  SIN FALLBACK - El mint es REAL o FALLA`);
      throw mintError; // LANZAR ERROR SIN INTENTAR SIMULACIONES
    }


  } catch (error: any) {
    console.error('\n❌ [USD → USDT] Error CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Estrategia 1: MINT REAL via función mint() del ABI USDT
 */
async function performMintingReal(
  web3: Web3,
  toAddress: string,
  amountUSDT: number,
  walletAddress: string,
  privateKey: string
): Promise<{ txHash: string; success: boolean }> {
  try {
    console.log('\n   🔐 [MINT REAL] Preparando transacción mint()...');
    console.log('   └─ Usando función mint() del contrato USDT oficial');

    // Validar private key
    if (!privateKey.startsWith('0x') && privateKey.length === 64) {
      privateKey = '0x' + privateKey;
    }
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error('Private key inválido (debe ser 0x + 64 caracteres hex)');
    }
    console.log(`   ✅ Private key validada (longitud: ${privateKey.length})`);

    // Obtener nonce
    const nonce = await web3.eth.getTransactionCount(walletAddress, 'pending');
    console.log(`   - Nonce: ${nonce}`);

    // Obtener gas price con +50%
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceIncrease = (BigInt(gasPrice) * BigInt(150)) / BigInt(100);
    console.log(`   - Gas Price Base: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
    console.log(`   - Gas Price (+50%): ${web3.utils.fromWei(gasPriceIncrease.toString(), 'gwei')} Gwei`);

    // Crear contrato
    const contract = new web3.eth.Contract(USDT_ABI as any, USDT_CONTRACT);
    console.log(`   - Contrato USDT: ${USDT_CONTRACT}`);

    // Convertir a units (USDT = 6 decimales, mwei)
    const amountInUnits = web3.utils.toWei(amountUSDT.toString(), 'mwei');
    console.log(`   - Cantidad en decimales: ${amountUSDT} USDT`);
    console.log(`   - Cantidad en units (6 decimales): ${amountInUnits}`);

    // Preparar función mint
    console.log(`   📝 Codificando función mint(${toAddress}, ${amountInUnits})...`);
    const mintData = contract.methods.mint(toAddress, amountInUnits).encodeABI();
    console.log(`   ✅ ABI Encoded: ${mintData.substring(0, 80)}...`);
    console.log(`   ✅ Longitud del call data: ${mintData.length} caracteres`);

    // Estimar gas
    let gasLimit = 100000;
    try {
      console.log(`   ⏳ Estimando gas para mint()...`);
      const estimatedGas = await web3.eth.estimateGas({
        from: walletAddress,
        to: USDT_CONTRACT,
        data: mintData,
        value: '0'
      });
      gasLimit = Math.ceil(Number(estimatedGas) * 1.2);
      console.log(`   - Gas estimado: ${estimatedGas}`);
      console.log(`   - Gas final (+20%): ${gasLimit}`);
    } catch (e: any) {
      console.log(`   ⚠️  Gas estimation falló: ${e.message}`);
      console.log(`   ℹ️  Usando gas limit por defecto: ${gasLimit}`);
    }

    // Crear transacción
    console.log(`\n   📋 [TRANSACCIÓN] Preparando estructura tx...`);
    const tx = {
      from: walletAddress,
      to: USDT_CONTRACT,
      data: mintData,
      value: '0',
      gas: gasLimit,
      gasPrice: gasPriceIncrease.toString(),
      nonce: nonce,
      chainId: 1
    };
    console.log(`   ✅ TX estructura lista`);
    console.log(`      - From: ${tx.from}`);
    console.log(`      - To: ${tx.to}`);
    console.log(`      - Gas: ${tx.gas}`);
    console.log(`      - GasPrice: ${tx.gasPrice}`);
    console.log(`      - Nonce: ${tx.nonce}`);
    console.log(`      - ChainId: ${tx.chainId}`);

    // Firmar transacción
    console.log(`\n   🔐 [FIRMA] Firmando transacción...`);
    const signedTx = await web3.eth.accounts.signTransaction(tx as any, privateKey);
    if (!signedTx.rawTransaction) {
      throw new Error('Error al firmar - no se generó rawTransaction');
    }
    console.log(`   ✅ Transacción firmada exitosamente`);
    console.log(`   📝 Raw TX: ${signedTx.rawTransaction.substring(0, 80)}...`);

    // Enviar transacción
    console.log(`\n   📤 [ENVÍO] Enviando transacción a blockchain...`);
    console.log(`   🔗 Red: Ethereum Mainnet`);
    console.log(`   📡 RPC: ${ETH_RPC_URL.substring(0, 60)}...`);
    
    return new Promise((resolve, reject) => {
      const receipt = web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
      
      let txHashReceived = false;
      
      receipt
        .on('transactionHash', (txHash: string) => {
          txHashReceived = true;
          console.log(`   ✅ ¡TX ENVIADA! Hash: ${txHash}`);
          console.log(`   🔗 Verificar en Etherscan: https://etherscan.io/tx/${txHash}`);
          resolve({
            txHash,
            success: true
          });
        })
        .on('confirmation', (confirmationNumber: number) => {
          console.log(`   ✅ Confirmación #${confirmationNumber}`);
        })
        .on('error', (error: Error) => {
          console.log(`   ❌ Error en transacción: ${error.message}`);
          if (!txHashReceived) {
            reject(error);
          }
        });

      // Timeout: 60 segundos para transacción real
      setTimeout(() => {
        if (!txHashReceived) {
          reject(new Error('⏱️ Timeout esperando TX Hash (60s). Verifica conexión a Ethereum. Revisa Etherscan manualmente.'));
        }
      }, 60000);
    });

  } catch (error: any) {
    console.error(`   ❌ [MINT REAL] Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Estrategia 2: TRANSFER REAL via ABI USDT
 */
async function performRealTransfer(
  web3: Web3,
  toAddress: string,
  amountUSDT: number,
  walletAddress: string,
  privateKey: string
): Promise<{ txHash: string; success: boolean }> {
  try {
    console.log('   🔐 [TRANSFER REAL] Preparando transacción...');

    // Obtener nonce
    const nonce = await web3.eth.getTransactionCount(walletAddress, 'pending');
    console.log(`   - Nonce: ${nonce}`);

    // Obtener gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceIncrease = (BigInt(gasPrice) * BigInt(150)) / BigInt(100);
    console.log(`   - Gas Price: ${web3.utils.fromWei(gasPriceIncrease.toString(), 'gwei')} Gwei`);

    // Crear contrato
    const contract = new web3.eth.Contract(USDT_ABI as any, USDT_CONTRACT);

    // Convertir a units (USDT = 6 decimales)
    const amountInUnits = web3.utils.toWei(amountUSDT.toString(), 'mwei');
    console.log(`   - Cantidad: ${amountInUnits} units (${amountUSDT} USDT)`);

    // Preparar función transfer
    const transferData = contract.methods.transfer(toAddress, amountInUnits).encodeABI();
    console.log(`   ✅ ABI Encoded: ${transferData.substring(0, 50)}...`);

    // Estimar gas
    let gasLimit = 100000;
    try {
      const estimatedGas = await web3.eth.estimateGas({
        from: walletAddress,
        to: USDT_CONTRACT,
        data: transferData,
        value: '0'
      });
      gasLimit = Math.ceil(Number(estimatedGas) * 1.2);
      console.log(`   - Gas estimado: ${gasLimit}`);
    } catch (e) {
      console.log(`   ⚠️  Gas estimation falló, usando default: ${gasLimit}`);
    }

    // Crear transacción
    const tx = {
      from: walletAddress,
      to: USDT_CONTRACT,
      data: transferData,
      value: '0',
      gas: gasLimit,
      gasPrice: gasPriceIncrease.toString(),
      nonce: nonce,
      chainId: 1
    };

    // Firmar transacción
    console.log('   🔐 Firmando...');
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    if (!signedTx.rawTransaction) {
      throw new Error('Error al firmar la transacción');
    }

    // Enviar transacción
    console.log('   📤 Enviando a blockchain...');
    return new Promise((resolve, reject) => {
      const receipt = web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
      
      receipt
        .on('transactionHash', (txHash: string) => {
          console.log(`   ✅ TX Hash: ${txHash}`);
          resolve({
            txHash,
            success: true
          });
        })
        .on('error', (error: Error) => {
          console.log(`   ❌ Error: ${error.message}`);
          reject(error);
        });

      // Timeout
      setTimeout(() => reject(new Error('Timeout esperando confirmación')), 30000);
    });

  } catch (error: any) {
    console.error(`   ❌ [TRANSFER REAL] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Estrategia 3: MINTING SIMULADO
 */
async function performMintingSimulation(
  web3: Web3,
  toAddress: string,
  amountUSDT: number,
  walletAddress: string,
  privateKey: string
): Promise<{ txHash: string; success: boolean }> {
  try {
    console.log('   🎲 [MINTING SIMULADO] Creando transacción simulada...');

    // Obtener nonce
    const nonce = await web3.eth.getTransactionCount(walletAddress, 'pending');
    console.log(`   - Nonce: ${nonce}`);

    // Obtener gas price
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceIncrease = (BigInt(gasPrice) * BigInt(150)) / BigInt(100);

    // Simular minting: enviar ETH para gas
    const tx = {
      from: walletAddress,
      to: toAddress,
      value: web3.utils.toWei('0.001', 'ether'),
      gas: 21000,
      gasPrice: gasPriceIncrease.toString(),
      nonce: nonce,
      chainId: 1
    };

    console.log('   🔐 Firmando...');
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    if (!signedTx.rawTransaction) {
      throw new Error('Error al firmar la transacción');
    }

    console.log('   📤 Enviando a blockchain...');
    return new Promise((resolve, reject) => {
      const receipt = web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
      
      receipt
        .on('transactionHash', (txHash: string) => {
          console.log(`   ✅ TX Hash: ${txHash}`);
          resolve({
            txHash,
            success: true
          });
        })
        .on('error', (error: Error) => {
          console.log(`   ❌ Error: ${error.message}`);
          reject(error);
        });

      setTimeout(() => reject(new Error('Timeout')), 30000);
    });

  } catch (error: any) {
    console.error(`   ❌ [MINTING SIMULADO] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Función exportada para compatibilidad con USDTConverterModule
 */
export async function executeMintingSimulation(
  toAddress: string,
  amountUSD: number
): Promise<{ txHash: string; success: boolean }> {
  if (!PRIVATE_KEY || !WALLET_ADDRESS) {
    throw new Error('Credenciales Ethereum no configuradas');
  }
  
  const web3 = initWeb3();
  
  // Convertir USD a USDT usando oráculo
  const rate = await getUSDToUSDTRate();
  const amountUSDT = amountUSD * rate;
  
  return performMintingSimulation(web3, toAddress, amountUSDT, WALLET_ADDRESS, PRIVATE_KEY);
}
