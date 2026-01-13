import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);



import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);


import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

// Direcciones de tokens
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

async function verifyBalances() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   💰 VERIFICACIÓN DE BALANCES DE TOKENS                    ║');
  console.log('║   Rastreando USDC/USDT/DAI de las pruebas                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('🔍 INFORMACIÓN DE LA BILLETERA');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`├─ Dirección: ${signerAddress}`);
    
    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    console.log(`├─ Balance ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('');

    // Crear contratos para los tokens
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const daiContract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

    // Obtener decimales
    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();
    const daiDecimals = await daiContract.decimals();

    console.log('💵 BALANCES DE STABLECOINS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // USDC
    const usdcBalance = await usdcContract.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`🔵 USDC (USD Coin)`);
    console.log(`├─ Dirección: ${USDC_ADDRESS}`);
    console.log(`├─ Balance: ${usdcFormatted} USDC`);
    console.log(`├─ Balance Raw: ${usdcBalance.toString()}`);
    console.log(`├─ Decimales: ${usdcDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdcFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // USDT
    const usdtBalance = await usdtContract.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
    console.log(`🟡 USDT (Tether)`);
    console.log(`├─ Dirección: ${USDT_ADDRESS}`);
    console.log(`├─ Balance: ${usdtFormatted} USDT`);
    console.log(`├─ Balance Raw: ${usdtBalance.toString()}`);
    console.log(`├─ Decimales: ${usdtDecimals}`);
    console.log(`├─ Estado: ${parseFloat(usdtFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // DAI
    const daiBalance = await daiContract.balanceOf(signerAddress);
    const daiFormatted = ethers.formatUnits(daiBalance, daiDecimals);
    console.log(`⚪ DAI (Dai Stablecoin)`);
    console.log(`├─ Dirección: ${DAI_ADDRESS}`);
    console.log(`├─ Balance: ${daiFormatted} DAI`);
    console.log(`├─ Balance Raw: ${daiBalance.toString()}`);
    console.log(`├─ Decimales: ${daiDecimals}`);
    console.log(`├─ Estado: ${parseFloat(daiFormatted) > 0 ? '✅ CON FONDOS' : '❌ SIN FONDOS'}`);
    console.log('');

    // Resumen
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN TOTAL');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const totalStablecoins = parseFloat(usdcFormatted) + parseFloat(usdtFormatted) + parseFloat(daiFormatted);
    console.log(`├─ USDC Total: ${usdcFormatted} 🔵`);
    console.log(`├─ USDT Total: ${usdtFormatted} 🟡`);
    console.log(`├─ DAI Total: ${daiFormatted} ⚪`);
    console.log(`├─ ─────────────────────────`);
    console.log(`├─ Total Stablecoins: ${totalStablecoins.toFixed(2)} USD`);
    console.log('');

    // Análisis
    console.log('════════════════════════════════════════════════════════════');
    console.log('🔎 ANÁLISIS');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (parseFloat(usdcFormatted) > 0) {
      console.log(`✅ USDC DETECTADO: ${usdcFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDC EN LA BILLETERA`);
    }

    if (parseFloat(usdtFormatted) > 0) {
      console.log(`✅ USDT DETECTADO: ${usdtFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY USDT EN LA BILLETERA`);
    }

    if (parseFloat(daiFormatted) > 0) {
      console.log(`✅ DAI DETECTADO: ${daiFormatted} USD`);
    } else {
      console.log(`⚠️  NO HAY DAI EN LA BILLETERA`);
    }

    console.log('');

    // Explicación de dónde están los USDC
    console.log('════════════════════════════════════════════════════════════');
    console.log('❓ ¿DÓNDE ESTÁN LOS USDC DE LAS PRUEBAS?');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    console.log('Posibles ubicaciones:');
    console.log('');
    console.log('1️⃣  EN EL CONTRATO BOT');
    console.log('   └─ Los fondos pueden estar en el contrato inteligente');
    console.log('   └─ Requiere llamar a função de retiro (withdrawProfit)');
    console.log('');

    console.log('2️⃣  EN PISCINAS DE LIQUIDEZ');
    console.log('   └─ Pueden estar bloqueados en Curve/Uniswap');
    console.log('   └─ Requiere transacción de salida (remove liquidity)');
    console.log('');

    console.log('3️⃣  EN TRANSACCIONES PENDIENTES');
    console.log('   └─ Esperando confirmación en blockchain');
    console.log('   └─ Verificar en Etherscan con el hash de TX');
    console.log('');

    console.log('4️⃣  QUEMADOS/PERDIDOS');
    console.log('   └─ Error en la transacción (revert)');
    console.log('   └─ Fondos devueltos a billetera automáticamente');
    console.log('');

    // Verificar contrato Bot
    console.log('════════════════════════════════════════════════════════════');
    console.log('🤖 VERIFICANDO CONTRATO BOT');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const botAddress = '0x7025BfcCEC45613C371B24a7F8B53f1ccc458D3F';
    const botUsdcBalance = await usdcContract.balanceOf(botAddress);
    const botUsdcFormatted = ethers.formatUnits(botUsdcBalance, usdcDecimals);

    console.log(`Contrato Bot: ${botAddress}`);
    console.log(`USDC en Bot: ${botUsdcFormatted} USDC`);
    
    if (parseFloat(botUsdcFormatted) > 0) {
      console.log(`✅ Hay ${botUsdcFormatted} USDC en el contrato`);
      console.log(`   Puedes retirar con: withdrawProfit()`);
    } else {
      console.log(`❌ No hay USDC en el contrato bot`);
    }

    console.log('');

    // Verificar histórico de transacciones recientes
    console.log('════════════════════════════════════════════════════════════');
    console.log('📜 TRANSACCIONES RECIENTES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Buscar eventos de transferencia USDC
    const filter = usdcContract.filters.Transfer(null, signerAddress);
    const events = await provider.getLogs({
      address: USDC_ADDRESS,
      topics: filter.topics,
      fromBlock: 'latest' - 1000
    });

    if (events.length > 0) {
      console.log(`✅ Se encontraron ${events.length} transferencias USDC entrantes`);
    } else {
      console.log(`❌ No hay transferencias USDC registradas recientemente`);
    }

    console.log('');

    // Recomendaciones
    console.log('════════════════════════════════════════════════════════════');
    console.log('💡 RECOMENDACIONES');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    if (totalStablecoins === 0) {
      console.log('⚠️  LOS USDC NO LLEGARON A LA BILLETERA');
      console.log('');
      console.log('Acciones a tomar:');
      console.log('1. Verificar hashes de transacción en Etherscan');
      console.log('2. Buscar en el contrato bot con withdrawProfit()');
      console.log('3. Revisar logs de error en las pruebas');
      console.log('4. Ejecutar nueva prueba de transacción directa');
    } else {
      console.log('✅ FONDOS DETECTADOS');
      console.log('');
      console.log(`Total de ${totalStablecoins.toFixed(2)} USD en tu billetera`);
      console.log('');
      console.log('Puedes:');
      console.log('1. Enviar fondos a otro wallet');
      console.log('2. Reinvertir en nuevas operaciones');
      console.log('3. Retirar a exchange (Binance, Coinbase)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

verifyBalances().catch(console.error);




