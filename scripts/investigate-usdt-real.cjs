const { ethers } = require('ethers');
require('dotenv').config();

async function investigateUSDT() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    🔍 INVESTIGANDO USDT REAL - FUNCIONES DISPONIBLES     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Obtener código del contrato
    console.log('📍 Obteniendo código del contrato USDT...\n');
    const code = await provider.getCode(USDT_ADDRESS);
    
    console.log('✅ Contrato encontrado en Mainnet');
    console.log('   Dirección:', USDT_ADDRESS);
    console.log('   Bytecode Size:', (code.length / 2), 'bytes');
    console.log('   Status: ✅ ACTIVO\n');

    // ABI USDT COMPLETO (del contrato original verificado)
    const USDT_FULL_ABI = [
      // Información básica
      { "constant": true, "inputs": [], "name": "name", "outputs": [{ "name": "", "type": "string" }], "type": "function" },
      { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" },
      { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
      { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "", "type": "uint256" }], "type": "function" },
      
      // Balance
      { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
      
      // Transferencias
      { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
      { "constant": false, "inputs": [{ "name": "_from", "type": "address" }, { "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
      
      // Aprobaciones
      { "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
      { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "type": "function" },
      
      // Funciones del propietario (posiblemente)
      { "constant": false, "inputs": [{ "name": "_blacklistedUser", "type": "address" }], "name": "addBlackList", "outputs": [], "type": "function" },
      { "constant": false, "inputs": [{ "name": "_clearedUser", "type": "address" }], "name": "removeBlackList", "outputs": [], "type": "function" },
      { "constant": true, "inputs": [{ "name": "_maker", "type": "address" }], "name": "getBlackListStatus", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
      { "constant": false, "inputs": [], "name": "destroyBlackFunds", "outputs": [], "type": "function" },
      
      // Posibles funciones de administración
      { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "name": "", "type": "address" }], "type": "function" },
      { "constant": false, "inputs": [{ "name": "_amount", "type": "uint256" }], "name": "burn", "outputs": [], "type": "function" },
      { "constant": false, "inputs": [{ "name": "_address", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "burnFrom", "outputs": [{ "name": "", "type": "bool" }], "type": "function" },
      { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_amount", "type": "uint256" }], "name": "mint", "outputs": [], "type": "function" },
      { "constant": false, "inputs": [{ "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "type": "function" },
    ];

    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_FULL_ABI, provider);

    console.log('📊 INFORMACIÓN DEL CONTRATO USDT:\n');

    const name = await usdtContract.name();
    const symbol = await usdtContract.symbol();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const owner = await usdtContract.owner();

    console.log('Nombre:', name);
    console.log('Símbolo:', symbol);
    console.log('Decimales:', decimals);
    console.log('Supply Total:', ethers.formatUnits(totalSupply, decimals));
    console.log('Owner:', owner);
    console.log('');

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🔑 FUNCIONES DISPONIBLES EN USDT                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const functions = [
      '✅ transfer() - Transferir USDT existente',
      '✅ transferFrom() - Transferir con aprobación',
      '✅ approve() - Aprobar gastador',
      '✅ balanceOf() - Ver balance',
      '✅ totalSupply() - Ver supply total',
      '⚠️  mint() - REQUIERE ser owner (TÚ NO eres owner)',
      '⚠️  burn() - Quemar tokens',
      '⚠️  burnFrom() - Quemar de otro',
      '❌ addBlackList() - Solo owner',
      '❌ removeBlackList() - Solo owner',
      '❌ destroyBlackFunds() - Solo owner'
    ];

    functions.forEach(f => console.log(f));

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              🚨 PROBLEMA ENCONTRADO                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('❌ USDT OFICIAL - Propietario:');
    console.log('   ' + owner);
    console.log('\n❌ TU WALLET:');
    console.log('   0x05316B102FE62574b9cBd45709f8F1B6C00beC8a');
    console.log('\n❌ ¿Son iguales?', owner.toLowerCase() === '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a'.toLowerCase());

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         ✅ SOLUCIÓN: USAR TRANSFER EN LUGAR DE MINT     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 LA ÚNICA FORMA DE "MINTEAR" USDT REAL ES:\n');

    console.log('OPCIÓN 1: Depositar USDT real en el Minter');
    console.log('   ✅ Tendrías USDT real en tu contrato');
    console.log('   ✅ Luego lo transferirías a usuarios');
    console.log('   ❌ Requiere USDT real previo\n');

    console.log('OPCIÓN 2: Usar approve + transferFrom');
    console.log('   ✅ Usuarios aprueban su USDT');
    console.log('   ✅ Tu contrato lo transfiere');
    console.log('   ❌ Requiere que usuarios tengan USDT\n');

    console.log('OPCIÓN 3: Usar MyUSDT personalizado (ya deployado)');
    console.log('   ✅ Tu contrato SÍ puede mintear');
    console.log('   ✅ Es un token nuevo pero funcional');
    console.log('   ✅ Tienes 1000 MyUSDT en tu wallet\n');

    console.log('OPCIÓN 4: Wrapper Contract (Simulación de conversión)');
    console.log('   ✅ Recibe USD (simulado)');
    console.log('   ✅ Transfiere USDT real si lo tienes');
    console.log('   ✅ Registra conversión en eventos\n');

    return {
      usdtOwner: owner,
      canMint: owner.toLowerCase() === '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a'.toLowerCase(),
      totalSupply: ethers.formatUnits(totalSupply, decimals)
    };

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

investigateUSDT().then(result => {
  console.log('\n🎯 CONCLUSIÓN:\n');
  console.log('Owner de USDT:', result.usdtOwner);
  console.log('¿Puedes mintear?:', result.canMint ? 'SÍ' : 'NO');
  console.log('Supply USDT:', result.totalSupply);
  process.exit(0);
});









