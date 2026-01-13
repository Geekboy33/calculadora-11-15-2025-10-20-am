/**
 * 🔄 JSON USDT CONVERTER - Sistema de Conversión USD → USDT desde JSON
 * ✅ Lee fondos.json y realiza transacciones automáticas
 * 📊 Oracle de Precios CoinGecko en Tiempo Real
 * ⚙️ INTEGRADO CON: Convertidor USD → USDT Module
 */

import Web3 from 'web3';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const ETH_RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;
const FONDOS_JSON_PATH = path.join(__dirname, '../data/fondos.json');

// ABI del contrato USDT
const USDT_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * 📊 Obtener tasa de cambio USD/USDT del Oracle CoinGecko
 */
export async function getPriceOracle() {
  try {
    console.log('🔍 [Oracle] Consultando precio USDT/USD...');
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'tether',
          vs_currencies: 'usd',
          include_market_cap: 'false',
          include_24hr_vol: 'true'
        }
      }
    );

    const rate = response.data.tether.usd;
    const volume24h = response.data.tether.usd_24h_vol;

    console.log(`✅ [Oracle] Tasa USDT: $${rate}`);
    console.log(`📈 [Oracle] Volumen 24h: $${volume24h}`);

    return {
      rate,
      volume24h,
      timestamp: new Date().toISOString(),
      source: 'CoinGecko'
    };
  } catch (error) {
    console.error('❌ [Oracle] Error al obtener tasa:', error.message);
    // Fallback a tasa fija
    return {
      rate: 0.9989,
      volume24h: 0,
      timestamp: new Date().toISOString(),
      source: 'Fallback',
      error: error.message
    };
  }
}

/**
 * 📂 Leer y validar archivo JSON de fondos
 */
export function readFondosJSON() {
  try {
    if (!fs.existsSync(FONDOS_JSON_PATH)) {
      console.warn(`⚠️ [JSON] Archivo no encontrado: ${FONDOS_JSON_PATH}`);
      return null;
    }

    const data = fs.readFileSync(FONDOS_JSON_PATH, 'utf-8');
    const fondos = JSON.parse(data);

    console.log(`✅ [JSON] Archivo leído exitosamente`);
    console.log(`📊 [JSON] Total cuentas: ${fondos.cuentas_bancarias?.length || 0}`);

    return fondos;
  } catch (error) {
    console.error('❌ [JSON] Error al leer archivo:', error.message);
    return null;
  }
}

/**
 * 🔄 Convertir USD a USDT basado en oracle
 */
export async function convertUSDToUSDT(amountUSD) {
  const priceData = await getPriceOracle();
  const amountUSDT = amountUSD / priceData.rate;
  
  return {
    amountUSD,
    amountUSDT: parseFloat(amountUSDT.toFixed(6)),
    rate: priceData.rate,
    priceSource: priceData.source
  };
}

/**
 * ✅ Procesar transacción individual
 */
export async function processTransaction(web3, cuenta, priceData) {
  try {
    console.log(`\n💳 [TX] Procesando cuenta: ${cuenta.nombre}`);
    console.log(`   Monto USD: $${cuenta.monto_usd}`);
    console.log(`   Destino: ${cuenta.direccion_usdt}`);

    // Validar dirección
    if (!web3.utils.isAddress(cuenta.direccion_usdt)) {
      throw new Error('Dirección inválida');
    }

    // Convertir USD a USDT
    const amountUSDT = cuenta.monto_usd / priceData.rate;
    const amountUSDTInt = web3.utils.toWei(
      amountUSDT.toFixed(6),
      'mwei'
    );

    console.log(`   USDT: ${amountUSDT.toFixed(6)}`);

    // Crear contrato
    const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT);

    // Obtener nonce
    const nonce = await web3.eth.getTransactionCount(WALLET_ADDRESS, 'pending');
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceIncreased = (BigInt(gasPrice) * BigInt(150)) / BigInt(100);

    // Crear transacción
    const transferABI = contract.methods.transfer(
      cuenta.direccion_usdt,
      amountUSDTInt
    ).encodeABI();

    // Estimar gas
    let estimatedGas = 100000n;
    try {
      const estimate = await web3.eth.estimateGas({
        from: WALLET_ADDRESS,
        to: USDT_CONTRACT,
        data: transferABI,
        value: '0'
      });
      estimatedGas = (BigInt(estimate) * BigInt(120)) / BigInt(100);
    } catch (e) {
      console.warn(`⚠️ [TX] Usando gas estimado por defecto`);
    }

    const tx = {
      from: WALLET_ADDRESS,
      to: USDT_CONTRACT,
      data: transferABI,
      gas: estimatedGas.toString(),
      gasPrice: gasPriceIncreased.toString(),
      nonce: nonce,
      value: '0'
    };

    // Firmar transacción
    const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY;
    const signedTx = await web3.eth.accounts.signTransaction(tx, key);

    if (!signedTx.rawTransaction) {
      throw new Error('Error al firmar transacción');
    }

    // Enviar transacción
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log(`✅ [TX] Exitosa!`);
    console.log(`   Hash: ${receipt.transactionHash}`);
    console.log(`   Gas usado: ${receipt.gasUsed}`);

    return {
      success: true,
      cuenta: cuenta.nombre,
      txHash: receipt.transactionHash,
      amountUSDT: amountUSDT.toFixed(6),
      gasUsed: receipt.gasUsed,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ [TX] Error:`, error.message);
    return {
      success: false,
      cuenta: cuenta.nombre,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 🚀 Procesar todas las transacciones del JSON
 */
export async function processAllTransactions() {
  console.log('\n=== 🚀 INICIANDO PROCESAMIENTO MASIVO ===\n');

  // 1. Validar configuración
  if (!PRIVATE_KEY || !WALLET_ADDRESS) {
    console.error('❌ Faltan variables de entorno: PRIVATE_KEY o WALLET_ADDRESS');
    return [];
  }

  // 2. Inicializar Web3
  const web3 = new Web3(ETH_RPC_URL);
  console.log(`✅ [Web3] Conectado a Ethereum`);

  // 3. Leer archivo JSON
  const fondos = readFondosJSON();
  if (!fondos || !fondos.cuentas_bancarias) {
    console.error('❌ No se pudo leer el archivo JSON');
    return [];
  }

  // 4. Obtener oracle de precios
  const priceData = await getPriceOracle();

  // 5. Procesar cada transacción
  const results = [];
  for (const cuenta of fondos.cuentas_bancarias) {
    const result = await processTransaction(web3, cuenta, priceData);
    results.push(result);
    
    // Esperar entre transacciones
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 6. Resumen
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n=== 📊 RESUMEN ===');
  console.log(`✅ Exitosas: ${successful}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  return results;
}

/**
 * 📝 Crear archivo JSON de ejemplo
 */
export function createSampleFondosJSON() {
  const sample = {
    metadata: {
      version: '1.0',
      description: 'Fondos para conversión USD → USDT',
      created: new Date().toISOString()
    },
    configuracion: {
      tasa_minima: 0.98,
      tasa_maxima: 1.02,
      gas_limite: 200000,
      reintentos_maximos: 3
    },
    cuentas_bancarias: [
      {
        id: 1,
        nombre: "Cuenta Principal",
        monto_usd: 100.00,
        direccion_usdt: "0xac56805515af1552d8ae9ac190050a8e549dd2fb",
        estado: "pendiente"
      },
      {
        id: 2,
        nombre: "Cuenta Secundaria",
        monto_usd: 50.00,
        direccion_usdt: "0xac56805515af1552d8ae9ac190050a8e549dd2fb",
        estado: "pendiente"
      }
    ]
  };

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(
    FONDOS_JSON_PATH,
    JSON.stringify(sample, null, 2)
  );

  console.log(`✅ Archivo de ejemplo creado: ${FONDOS_JSON_PATH}`);
  return sample;
}

export default {
  getPriceOracle,
  readFondosJSON,
  convertUSDToUSDT,
  processTransaction,
  processAllTransactions,
  createSampleFondosJSON
};

