const ethers = require('ethers');
require('dotenv').config();

async function checkBalance() {
  try {
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY;
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    
    if (!privateKey) {
      throw new Error('❌ No se encontró ETH_PRIVATE_KEY en .env');
    }

    console.log('🔍 Verificando balance en Mainnet...\n');
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Ajustar formato de clave privada
    let key = privateKey;
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }
    
    const wallet = new ethers.Wallet(key, provider);
    const balance = await wallet.getBalance();
    const balanceEth = ethers.utils.formatEther(balance);
    
    console.log('📍 Wallet:', wallet.address);
    console.log('💰 Balance ETH:', balanceEth);
    console.log('💵 Balance Wei:', balance.toString());
    
    // Obtener gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    
    console.log('\n⛽ Gas Price:', gasPriceGwei, 'Gwei');
    
    // Calcular costo estimado
    const estimatedGas = 300000; // Promedio para deploy
    const estimatedCost = gasPrice.mul(estimatedGas);
    const estimatedCostEth = ethers.utils.formatEther(estimatedCost);
    
    console.log('📊 Costo estimado deploy:', estimatedCostEth, 'ETH');
    console.log('💸 Costo estimado USD: ~$', (parseFloat(estimatedCostEth) * 2500).toFixed(2));
    
    if (balance.lt(estimatedCost)) {
      console.log('\n❌ ¡BALANCE INSUFICIENTE!');
      console.log('   Necesitas:', estimatedCostEth, 'ETH');
      console.log('   Tienes:', balanceEth, 'ETH');
      process.exit(1);
    } else {
      console.log('\n✅ ¡Balance SUFICIENTE!');
      console.log('   Procederemos con el deploy...\n');
    }
    
    return wallet;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBalance();









