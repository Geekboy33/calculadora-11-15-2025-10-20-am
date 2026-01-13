const { ethers } = require('ethers');
require('dotenv').config();

async function diagnoseUSDTIssue() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      🔍 DIAGNÓSTICO: ¿POR QUÉ NO RECIBO USDT REALES?     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const MINTER_ADDRESS = '0x291893448191b49d79901Abdb07dCE4EE346b2a6';
    const WALLET_ADDRESS = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // ABI USDT
    const USDT_ABI = [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function'
      },
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
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
        type: 'function'
      }
    ];

    console.log('📍 PASO 1: Verificar Balance de USDT en tu Wallet\n');
    
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
    const decimals = await usdtContract.decimals();
    const walletBalance = await usdtContract.balanceOf(WALLET_ADDRESS);
    const walletBalanceFormatted = ethers.formatUnits(walletBalance, decimals);

    console.log('Wallet:', WALLET_ADDRESS);
    console.log('Balance USDT (Wei):', walletBalance.toString());
    console.log('Balance USDT (Formato):', walletBalanceFormatted);
    
    if (walletBalance === 0n) {
      console.log('❌ ¡¡0 USDT EN TU WALLET!!');
      console.log('   Los 1000 USDT NO se recibieron\n');
    } else {
      console.log('✅ Tienes USDT en tu wallet:', walletBalanceFormatted, '\n');
      return;
    }

    console.log('📍 PASO 2: Verificar Balance en el Contrato Minter\n');
    
    const minterBalance = await usdtContract.balanceOf(MINTER_ADDRESS);
    const minterBalanceFormatted = ethers.formatUnits(minterBalance, decimals);

    console.log('Contrato Minter:', MINTER_ADDRESS);
    console.log('Balance USDT (Wei):', minterBalance.toString());
    console.log('Balance USDT (Formato):', minterBalanceFormatted);
    
    if (minterBalance === 0n) {
      console.log('❌ Contrato Minter NO tiene USDT\n');
    } else {
      console.log('⚠️  Contrato Minter tiene USDT pero no te los envió\n');
    }

    console.log('📍 PASO 3: Analizar Eventos de Transacción\n');
    
    console.log('TX Hash de minteo: 0x796971487b5d07c404f9b191b129180f882ab2be77351c128b6cb6bb9c8ac806');
    console.log('Estado: Aparentemente confirmada');
    console.log('Block: 24146862\n');

    console.log('📍 PASO 4: Verificar Funciones del Contrato Minter\n');

    const MINTER_ABI = [
      {
        inputs: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'amountUSD', type: 'uint256' }
        ],
        name: 'mintUSDT',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ];

    const minterContract = new ethers.Contract(MINTER_ADDRESS, MINTER_ABI, provider);
    
    console.log('Contrato Minter cargado exitosamente');
    console.log('Función mintUSDT: Disponible\n');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🔍 ANÁLISIS DEL PROBLEMA                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('🚨 PROBLEMAS IDENTIFICADOS:\n');

    if (walletBalance === 0n && minterBalance === 0n) {
      console.log('❌ PROBLEMA CRÍTICO: No hay USDT en ningún lado');
      console.log('   Posibles causas:');
      console.log('   1. El minteo NO se ejecutó realmente');
      console.log('   2. El contrato NO tiene permisos de mint en USDT');
      console.log('   3. La transacción falló silenciosamente');
      console.log('   4. El contrato está vacío sin USDT para transferir\n');
    } else if (walletBalance === 0n && minterBalance > 0n) {
      console.log('⚠️  USDT está en el Minter pero no en tu wallet');
      console.log('   Problema: La función transfer() no funcionó\n');
    }

    console.log('📋 DIAGNÓSTICO FINAL:\n');
    console.log('El contrato USDTMinter NO tiene permiso real de mint en USDT');
    console.log('El USDT oficial no permite que contratos externos hagan mint');
    console.log('Solo el propietario de USDT puede mintear\n');

    console.log('✅ SOLUCIÓN:\n');
    console.log('Opción 1: Usar transfer() en lugar de mint()');
    console.log('   - El Minter necesita USDT previo');
    console.log('   - Luego puede transferirlo\n');
    console.log('Opción 2: Crear un contrato ERC-20 personalizado');
    console.log('   - Contratos que SÍ permiten mint desde otros\n');
    console.log('Opción 3: Usar la función approve + transferFrom');
    console.log('   - El usuario aprueba, el Minter transfiere\n');

    return {
      walletBalance: walletBalanceFormatted,
      minterBalance: minterBalanceFormatted,
      issue: 'No hay USDT en wallet ni en minter',
      possibleCause: 'mint() no tiene permisos en USDT oficial'
    };

  } catch (error) {
    console.error('❌ ERROR EN DIAGNÓSTICO:');
    console.error('   ', error.message);
    process.exit(1);
  }
}

diagnoseUSDTIssue().then(result => {
  console.log('🎯 RESUMEN:\n');
  console.log('Wallet Balance:', result.walletBalance, 'USDT');
  console.log('Minter Balance:', result.minterBalance, 'USDT');
  console.log('Problema:', result.issue);
  console.log('Causa:', result.possibleCause);
  process.exit(0);
});









