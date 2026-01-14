const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

/**
 * 🚀 CONVERSOR USD → USDT CON ORÁCULO REAL
 * 
 * ✅ Lee fondos.json
 * ✅ Obtiene tasa de CoinGecko
 * ✅ Convierte USD → USDT
 * ✅ Transfiere USDT real
 */

// ABI del USDT real
const USDT_ABI = [
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
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  }
];

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';

/**
 * ✅ Obtener tasa USD → USDT desde CoinGecko
 */
async function getUSDToUSDTRate() {
  try {
    console.log('📊 Obteniendo tasa de CoinGecko...');
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'
    );
    
    const rate = response.data.tether.usd;
    console.log('✅ Tasa obtenida:', rate, 'USD por USDT');
    
    return rate;
  } catch (error) {
    console.error('❌ Error obteniendo tasa:', error.message);
    throw error;
  }
}

/**
 * ✅ Leer archivo fondos.json
 */
function readFondosJson(filePath) {
  try {
    console.log('\n📂 Leyendo archivo fondos.json...');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Archivo fondos.json no encontrado');
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const fondos = JSON.parse(data);
    
    console.log('✅ Archivo cargado');
    console.log('   Total de cuentas:', fondos.cuentas_bancarias.length);
    
    return fondos;
  } catch (error) {
    console.error('❌ Error leyendo fondos.json:', error.message);
    throw error;
  }
}

/**
 * ✅ Convertir USD a USDT con tasa de oráculo
 */
function convertUSDToUSDT(amountUSD, rate) {
  const amountUSDT = amountUSD / rate; // USD / rate = USDT
  return amountUSDT;
}

/**
 * ✅ FUNCIÓN PRINCIPAL: Convertir y transferir USDT
 */
async function convertirUSDaUSDT() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 CONVERSOR USD → USDT CON ORÁCULO Y FONDOS.JSON      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('❌ ETH_PRIVATE_KEY no configurada');
    }

    // 1. Conectar a Ethereum
    console.log('📍 Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    let key = privateKey.trim();
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }
    
    const wallet = new ethers.Wallet(key, provider);
    console.log('✅ Wallet conectada:', wallet.address);

    // 2. Obtener balance ETH (para gas)
    const ethBalance = await provider.getBalance(wallet.address);
    console.log('💰 Balance ETH:', ethers.formatEther(ethBalance));

    if (ethBalance < ethers.parseEther('0.001')) {
      throw new Error('❌ Balance ETH insuficiente para gas');
    }

    // 3. Conectar al contrato USDT
    console.log('\n📦 Conectando a USDT real...');
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);
    console.log('✅ Contrato USDT cargado');

    // 4. Verificar balance USDT en tu wallet
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const decimals = await usdtContract.decimals();
    const usdtBalanceFormatted = ethers.formatUnits(usdtBalance, decimals);
    
    console.log('💳 Balance USDT en wallet:', usdtBalanceFormatted, 'USDT');

    if (usdtBalance === 0n) {
      console.log('\n⚠️  ADVERTENCIA: No tienes USDT en tu wallet');
      console.log('   No podrás transferir USDT a destinatarios');
      console.log('   Continuaremos solo con el cálculo de conversión\n');
    }

    // 5. Obtener tasa de oráculo
    const rate = await getUSDToUSDTRate();

    // 6. Leer fondos.json
    const fondosFilePath = './fondos.json';
    const fondos = readFondosJson(fondosFilePath);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          📊 PROCESANDO CONVERSIONES USD → USDT           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let totalUSD = 0;
    let totalUSDT = 0;
    const transacciones = [];

    // 7. Procesar cada cuenta
    for (let i = 0; i < fondos.cuentas_bancarias.length; i++) {
      const cuenta = fondos.cuentas_bancarias[i];
      
      console.log(`\n📋 Cuenta ${i + 1}:`);
      console.log('   ID:', cuenta.id);
      console.log('   Nombre:', cuenta.nombre);
      console.log('   Monto USD:', cuenta.monto_usd);
      console.log('   Wallet:', cuenta.direccion_usdt);

      // Convertir USD a USDT
      const amountUSDT = convertUSDToUSDT(cuenta.monto_usd, rate);
      const amountUSDTFormatted = amountUSDT.toFixed(6);
      
      console.log('   → Conversión:', cuenta.monto_usd, 'USD ÷', rate, '= ', amountUSDTFormatted, 'USDT');

      totalUSD += cuenta.monto_usd;
      totalUSDT += amountUSDT;

      // Intentar transferencia si tienes USDT
      let txHash = null;
      let status = 'PENDIENTE';

      if (usdtBalance >= ethers.parseUnits(amountUSDTFormatted, decimals)) {
        try {
          console.log('   ⏳ Transfiriendo USDT...');
          
          const amountInUnits = ethers.parseUnits(amountUSDTFormatted, decimals);
          const tx = await usdtContract.transfer(cuenta.direccion_usdt, amountInUnits);
          
          console.log('   📤 TX enviada:', tx.hash);
          console.log('   ⏳ Esperando confirmación...');
          
          const receipt = await tx.wait();
          txHash = tx.hash;
          status = '✅ CONFIRMADA';
          
          console.log('   ✅ Transacción confirmada en block:', receipt.blockNumber);
        } catch (error) {
          console.log('   ❌ Error en transferencia:', error.message);
          status = '❌ FALLIDA';
        }
      } else {
        console.log('   ⚠️  No hay USDT suficiente para transferir');
        status = '⚠️  SIN FONDOS';
      }

      transacciones.push({
        id: cuenta.id,
        nombre: cuenta.nombre,
        usd: cuenta.monto_usd,
        usdt: amountUSDTFormatted,
        wallet: cuenta.direccion_usdt,
        txHash: txHash,
        status: status
      });
    }

    // 8. Resumen final
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  📊 RESUMEN FINAL                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📈 TOTALES:');
    console.log('   USD Total:', totalUSD.toFixed(2));
    console.log('   USDT Total:', totalUSDT.toFixed(6));
    console.log('   Tasa Aplicada:', rate, 'USD/USDT');
    console.log('   Cuentas Procesadas:', fondos.cuentas_bancarias.length);

    console.log('\n📋 TRANSACCIONES:');
    transacciones.forEach((tx, idx) => {
      console.log(`\n   Transacción ${idx + 1}:`);
      console.log('   ID:', tx.id);
      console.log('   Nombre:', tx.nombre);
      console.log('   USD:', tx.usd, '→ USDT:', tx.usdt);
      console.log('   Wallet:', tx.wallet);
      console.log('   Status:', tx.status);
      if (tx.txHash) {
        console.log('   Hash:', tx.txHash);
        console.log('   Etherscan: https://etherscan.io/tx/' + tx.txHash);
      }
    });

    // 9. Guardar resultados en archivo
    const resultadosPath = './resultados-conversion.json';
    const resultados = {
      timestamp: new Date().toISOString(),
      rate: rate,
      totalUSD: totalUSD,
      totalUSDT: totalUSDT.toFixed(6),
      wallet: wallet.address,
      transacciones: transacciones
    };

    fs.writeFileSync(resultadosPath, JSON.stringify(resultados, null, 2));
    console.log('\n✅ Resultados guardados en: resultados-conversion.json');

    console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE\n');

    return resultados;

  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
convertirUSDaUSDT().then(resultado => {
  console.log('✨ Conversión finalizada');
  process.exit(0);
});










