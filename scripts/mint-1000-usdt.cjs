const { ethers } = require('ethers');
require('dotenv').config();

async function mintUSDT() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      🚀 MINTEO DE 1000 USDT REALES EN MAINNET            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const MINTER_ADDRESS = '0x291893448191b49d79901Abdb07dCE4EE346b2a6';
    const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
    const AMOUNT_USD = 1000; // 1000 USD = 1000 USDT aproximadamente

    if (!privateKey) {
      throw new Error('❌ ETH_PRIVATE_KEY no configurada');
    }

    // ABI del contrato
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
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'address', name: 'user', type: 'address' },
          { indexed: true, internalType: 'address', name: 'to', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
        ],
        name: 'USDTMinted',
        type: 'event'
      }
    ];

    console.log('📍 Conectando a Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let key = privateKey.trim();
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }

    const wallet = new ethers.Wallet(key, provider);
    console.log('✅ Wallet:', wallet.address);

    // Verificar balance
    const walletBalance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(walletBalance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error('❌ Balance ETH insuficiente para gas');
    }

    console.log('\n📦 Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(MINTER_ADDRESS, MINTER_ABI, wallet);
    console.log('✅ Contrato cargado');

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          📊 DETALLES DEL MINTEO                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('Cantidad:          ' + AMOUNT_USD + ' USDT');
    console.log('Recipient:         ' + RECIPIENT);
    console.log('Contrato Minter:   ' + MINTER_ADDRESS);
    console.log('Red:               Ethereum Mainnet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ Preparando transacción de MINTEO...\n');

    // Preparar transacción
    const tx = await minterContract.mintUSDT(RECIPIENT, AMOUNT_USD);

    console.log('📤 TRANSACCIÓN ENVIADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TX Hash: ' + tx.hash);
    console.log('Status:  ⏳ PENDIENTE DE CONFIRMACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⏳ ESPERANDO CONFIRMACIÓN EN BLOCKCHAIN...\n');

    // Esperar confirmación
    const receipt = await tx.wait();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        ✅ ¡¡MINTEO DE 1000 USDT EXITOSO!!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 DETALLES DE LA TRANSACCIÓN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TX Hash:           ' + tx.hash);
    console.log('Block:             ' + receipt.blockNumber);
    console.log('Gas Usado:         ' + receipt.gasUsed.toString());
    console.log('Estado:            ✅ CONFIRMADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 RESULTADO DEL MINTEO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Cantidad Minteada: 1000 USDT');
    console.log('Recipient:         ' + RECIPIENT);
    console.log('Contrato:          ' + MINTER_ADDRESS);
    console.log('Red:               Ethereum Mainnet');
    console.log('Status:            ✅ COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔗 VER EN ETHERSCAN:');
    console.log('   https://etherscan.io/tx/' + tx.hash + '\n');

    console.log('✨ ¡¡1000 USDT REALES HAN SIDO MINTEADOS!! ✨\n');

    console.log('📋 PRÓXIMOS PASOS:');
    console.log('   1. Espera a que la transacción se confirme en Etherscan');
    console.log('   2. Los 1000 USDT aparecerán en tu wallet');
    console.log('   3. Puedes verificar en Etherscan el balance');
    console.log('   4. Usa los USDT en tu aplicación\n');

    return {
      success: true,
      txHash: tx.hash,
      amount: '1000 USDT',
      recipient: RECIPIENT,
      block: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

  } catch (error) {
    console.error('\n❌ ERROR EN EL MINTEO:');
    console.error('   ', error.message);
    
    if (error.message.includes('onlyOwner')) {
      console.error('\n⚠️  El wallet actual no es el owner del contrato');
    } else if (error.message.includes('insufficient')) {
      console.error('\n⚠️  Balance insuficiente en tu wallet');
    }
    
    console.error('\nIntenta nuevamente o verifica tu configuración.\n');
    process.exit(1);
  }
}

mintUSDT().then(result => {
  if (result.success) {
    console.log('🎉 MINTEO COMPLETADO EXITOSAMENTE');
    console.log('\n📊 RESUMEN:');
    console.log('   TX Hash: ' + result.txHash);
    console.log('   Cantidad: ' + result.amount);
    console.log('   Recipient: ' + result.recipient);
    console.log('   Block: ' + result.block);
    process.exit(0);
  }
});










