const { ethers } = require('ethers');
require('dotenv').config();

async function testMinting() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🧪 TEST DE MINTEO REAL EN MAINNET               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const MINTER_ADDRESS = '0x291893448191b49d79901Abdb07dCE4EE346b2a6';
    const RECIPIENT = '0xac56805515af1552d8ae9ac190050a8e549dd2fb'; // Tu wallet test

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
        inputs: [],
        name: 'getContractUSDTBalance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
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
    console.log('✅ Wallet conectada:', wallet.address);

    // Conectar al contrato
    console.log('\n📦 Conectando al contrato USDTMinter...');
    const minterContract = new ethers.Contract(MINTER_ADDRESS, MINTER_ABI, wallet);
    console.log('✅ Contrato cargado:', MINTER_ADDRESS);

    // Obtener balance
    console.log('\n💰 Verificando balances...');
    const walletBalance = await provider.getBalance(wallet.address);
    console.log('   Wallet ETH:', ethers.formatEther(walletBalance));

    // Intentar obtener balance del contrato (USDT)
    try {
      const contractBalance = await minterContract.getContractUSDTBalance();
      console.log('   Contrato USDT:', ethers.formatUnits(contractBalance, 6));
    } catch (e) {
      console.log('   Contrato USDT: No se pudo obtener');
    }

    // REALIZAR MINT
    console.log('\n🚀 INICIANDO MINTEO REAL...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Cantidad a mintear: 50 USDT');
    console.log('Recipient: ', RECIPIENT);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ⏳ Preparar transacción
    console.log('\n⏳ Preparando transacción mint...');
    
    const amountUSD = 50; // 50 USD
    const tx = await minterContract.mintUSDT(RECIPIENT, amountUSD);

    console.log('📤 Transacción enviada');
    console.log('   TX Hash:', tx.hash);
    console.log('   Esperando confirmación...\n');

    // Esperar confirmación
    const receipt = await tx.wait();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ ¡¡MINTEO EXITOSO EN MAINNET!!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles de la Transacción:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TX Hash:', tx.hash);
    console.log('Block:', receipt.blockNumber);
    console.log('Gas Usado:', receipt.gasUsed.toString());
    console.log('Estado: ✅ CONFIRMADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Resultado del Mint:');
    console.log('   Cantidad: 50 USDT');
    console.log('   Recipient: ' + RECIPIENT);
    console.log('   Contrato: ' + MINTER_ADDRESS);
    console.log('\n🔗 Verificar en Etherscan:');
    console.log('   https://etherscan.io/tx/' + tx.hash);

    console.log('\n✨ ¡TEST EXITOSO! El minteo real funciona correctamente.\n');

    return {
      success: true,
      txHash: tx.hash,
      amount: '50 USDT',
      recipient: RECIPIENT,
      confirmations: receipt.confirmations
    };

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST DE MINTEO:');
    console.error('   ', error.message);
    
    if (error.message.includes('onlyOwner')) {
      console.error('\n⚠️  ERROR: Solo el owner puede mintear');
      console.error('   El wallet actual no es el owner del contrato');
    } else if (error.message.includes('insufficient')) {
      console.error('\n⚠️  ERROR: Balance insuficiente en contrato');
      console.error('   El contrato necesita USDT disponible');
    }
    
    process.exit(1);
  }
}

testMinting().then(result => {
  if (result.success) {
    console.log('🎉 TEST COMPLETADO EXITOSAMENTE');
    process.exit(0);
  }
});









