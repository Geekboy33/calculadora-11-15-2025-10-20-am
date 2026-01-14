const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deployMyUSDT() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 DEPLOYANDO MyUSDT EN MAINNET - CON MINT REAL      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';

    if (!privateKey) {
      throw new Error('❌ ETH_PRIVATE_KEY no configurada');
    }

    console.log('📍 Conectando a Ethereum Mainnet...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let key = privateKey.trim();
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }

    const wallet = new ethers.Wallet(key, provider);
    console.log('✅ Wallet:', wallet.address);

    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log('💰 Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error('❌ Balance ETH insuficiente');
    }

    console.log('\n📦 Cargando bytecode compilado...');
    const artifactPath = path.join(__dirname, '../artifacts/server/contracts/MyUSDT.sol/MyUSDT.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode;
    const abi = artifact.abi;

    console.log('✅ Bytecode cargado');

    console.log('\n🔨 Preparando deployer...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log('⏳ Deployando MyUSDT...\n');

    const contract = await factory.deploy();

    console.log('📤 Transacción enviada');
    console.log('   TX Hash:', contract.deploymentTransaction().hash);
    console.log('   Esperando confirmaciones...\n');

    const receipt = await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      ✅ ¡¡MyUSDT DEPLOYADO EN MAINNET!!                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles del Deploy:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dirección Contrato:', deployedAddress);
    console.log('TX Hash:', contract.deploymentTransaction().hash);
    console.log('Red: Ethereum Mainnet');
    console.log('Owner:', wallet.address);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Guardar configuración
    const envPath = path.join(__dirname, '../.env.myusdt');
    const content = `# MyUSDT Contract - Mainnet Deployment
VITE_MYUSDT_ADDRESS=${deployedAddress}
VITE_MYUSDT_NETWORK=mainnet
VITE_MYUSDT_DEPLOYED_AT=${new Date().toISOString()}
VITE_MYUSDT_TX_HASH=${contract.deploymentTransaction().hash}
VITE_MYUSDT_OWNER=${wallet.address}
`;

    fs.writeFileSync(envPath, content);
    console.log('✅ Configuración guardada en: .env.myusdt\n');

    console.log('🎯 Ahora haremos MINT de 1000 MyUSDT para ti...\n');

    // AHORA HACER MINT
    console.log('⏳ Preparando transacción de MINT...');
    
    const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
    const AMOUNT = ethers.parseUnits('1000', 6); // 1000 con 6 decimales

    const mintTx = await contract.mint(RECIPIENT, AMOUNT);

    console.log('📤 Transacción de MINT enviada');
    console.log('   TX Hash:', mintTx.hash);
    console.log('   Esperando confirmación...\n');

    const mintReceipt = await mintTx.wait();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ ¡¡MINT DE 1000 MyUSDT EXITOSO!!                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Detalles del MINT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TX Hash:', mintTx.hash);
    console.log('Cantidad:', '1000 MyUSDT');
    console.log('Recipient:', RECIPIENT);
    console.log('Contrato:', deployedAddress);
    console.log('Status: ✅ CONFIRMADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar balance
    console.log('⏳ Verificando balance...');
    const finalBalance = await contract.balanceOf(RECIPIENT);
    const finalBalanceFormatted = ethers.formatUnits(finalBalance, 6);

    console.log('✅ Balance en wallet:', finalBalanceFormatted, 'MyUSDT\n');

    console.log('🔗 Verificar Contratos en Etherscan:');
    console.log('   MyUSDT: https://etherscan.io/address/' + deployedAddress);
    console.log('   Deploy TX: https://etherscan.io/tx/' + contract.deploymentTransaction().hash);
    console.log('   Mint TX: https://etherscan.io/tx/' + mintTx.hash + '\n');

    console.log('✨ ¡¡TODO COMPLETADO EXITOSAMENTE!!\n');

    return {
      success: true,
      myusdtAddress: deployedAddress,
      deployTxHash: contract.deploymentTransaction().hash,
      mintTxHash: mintTx.hash,
      mintedAmount: '1000 MyUSDT',
      recipient: RECIPIENT,
      finalBalance: finalBalanceFormatted
    };

  } catch (error) {
    console.error('\n❌ ERROR EN DEPLOY/MINT:');
    console.error('   ', error.message);
    process.exit(1);
  }
}

deployMyUSDT().then(result => {
  console.log('🎉 PROCESO COMPLETADO');
  console.log('\n📋 RESUMEN:');
  console.log('   MyUSDT Address:', result.myusdtAddress);
  console.log('   Tu Balance: ' + result.finalBalance);
  process.exit(0);
});










