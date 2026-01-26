const https = require('https');

// Configuración correcta según el usuario:
const VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';
const MINTER_ADDRESS = '0xaccA35529b2FC2041dFb124F83f52120E24377B2';
const DEPLOYER_WALLET = '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559';

function rpcCall(method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    });
    
    const req = https.request({
      hostname: 'rpc.lemonchain.io',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('');
  console.log('================================================================================');
  console.log('         VERIFICACION VUSD CONTRACT Y MINTER ROLE - LEMONCHAIN');
  console.log('================================================================================');
  console.log('');
  
  console.log('CONFIGURACION:');
  console.log('--------------------------------------------------------------------------------');
  console.log('  VUSD Contract:    ' + VUSD_CONTRACT);
  console.log('  Minter Address:   ' + MINTER_ADDRESS);
  console.log('  Deployer Wallet:  ' + DEPLOYER_WALLET);
  console.log('');
  
  // Verificar que VUSD tiene código
  console.log('VERIFICANDO CONTRATO VUSD...');
  const codeResult = await rpcCall('eth_getCode', [VUSD_CONTRACT, 'latest']);
  const hasCode = codeResult.result && codeResult.result !== '0x' && codeResult.result.length > 4;
  console.log('  Contrato VUSD desplegado: ' + (hasCode ? 'SI' : 'NO'));
  
  // Get totalSupply - 0x18160ddd
  console.log('');
  console.log('VUSD TOKEN INFO:');
  console.log('--------------------------------------------------------------------------------');
  
  const totalSupplyResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: '0x18160ddd'
  }, 'latest']);
  
  if (totalSupplyResult.result && totalSupplyResult.result !== '0x') {
    const totalSupply = parseInt(totalSupplyResult.result, 16) / 1e18;
    console.log('  Total Supply: ' + totalSupply.toLocaleString() + ' VUSD');
  } else {
    console.log('  Total Supply: Error - ' + JSON.stringify(totalSupplyResult));
  }
  
  // Get name - 0x06fdde03
  const nameResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: '0x06fdde03'
  }, 'latest']);
  
  if (nameResult.result && nameResult.result.length > 2) {
    // Decode string from ABI
    try {
      const hex = nameResult.result.slice(2);
      const offset = parseInt(hex.slice(0, 64), 16) * 2;
      const length = parseInt(hex.slice(64, 128), 16);
      const nameHex = hex.slice(128, 128 + length * 2);
      let name = '';
      for (let i = 0; i < nameHex.length; i += 2) {
        name += String.fromCharCode(parseInt(nameHex.substr(i, 2), 16));
      }
      console.log('  Token Name: ' + name);
    } catch(e) {
      console.log('  Token Name: (raw) ' + nameResult.result.slice(0, 100) + '...');
    }
  }
  
  // Get MINTER_ROLE hash - 0xd5391393
  console.log('');
  console.log('MINTER ROLE VERIFICATION:');
  console.log('--------------------------------------------------------------------------------');
  
  const minterRoleResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: '0xd5391393'
  }, 'latest']);
  
  let minterRoleHash = null;
  if (minterRoleResult.result && minterRoleResult.result !== '0x') {
    minterRoleHash = minterRoleResult.result;
    console.log('  MINTER_ROLE hash: ' + minterRoleHash);
  } else {
    // Si no tiene MINTER_ROLE(), probablemente usa otro patrón
    console.log('  MINTER_ROLE(): No disponible directamente');
    // keccak256("MINTER_ROLE")
    minterRoleHash = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
    console.log('  Usando hash standard: ' + minterRoleHash);
  }
  
  // Check hasRole(MINTER_ROLE, minterAddress) - 0x91d14854
  // hasRole(bytes32 role, address account)
  const hasRoleData = '0x91d14854' + 
    minterRoleHash.slice(2).padStart(64, '0') +
    MINTER_ADDRESS.slice(2).toLowerCase().padStart(64, '0');
  
  const hasRoleResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: hasRoleData
  }, 'latest']);
  
  if (hasRoleResult.result) {
    const hasRole = hasRoleResult.result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    console.log('  ' + MINTER_ADDRESS + ' tiene MINTER_ROLE: ' + (hasRole ? 'SI' : 'NO'));
  } else {
    console.log('  hasRole check: Error - ' + JSON.stringify(hasRoleResult));
  }
  
  // Check si deployer tiene MINTER_ROLE
  const hasRoleDeployerData = '0x91d14854' + 
    minterRoleHash.slice(2).padStart(64, '0') +
    DEPLOYER_WALLET.slice(2).toLowerCase().padStart(64, '0');
  
  const hasRoleDeployerResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: hasRoleDeployerData
  }, 'latest']);
  
  if (hasRoleDeployerResult.result) {
    const hasRole = hasRoleDeployerResult.result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    console.log('  ' + DEPLOYER_WALLET + ' tiene MINTER_ROLE: ' + (hasRole ? 'SI' : 'NO'));
  }
  
  // Verificar balances LEMON
  console.log('');
  console.log('BALANCES LEMON (para gas):');
  console.log('--------------------------------------------------------------------------------');
  
  const minterBalance = await rpcCall('eth_getBalance', [MINTER_ADDRESS, 'latest']);
  const deployerBalance = await rpcCall('eth_getBalance', [DEPLOYER_WALLET, 'latest']);
  
  const minterLemon = parseInt(minterBalance.result, 16) / 1e18;
  const deployerLemon = parseInt(deployerBalance.result, 16) / 1e18;
  
  console.log('  Minter (' + MINTER_ADDRESS.slice(0,10) + '...): ' + minterLemon.toFixed(6) + ' LEMON');
  console.log('  Deployer (' + DEPLOYER_WALLET.slice(0,10) + '...): ' + deployerLemon.toFixed(6) + ' LEMON');
  
  console.log('');
  console.log('================================================================================');
  console.log('');
  
  if (minterLemon > 0) {
    console.log('>>> La direccion MINTER tiene LEMON para gas. Puede ejecutar mint.');
  } else if (deployerLemon > 0) {
    console.log('>>> El Deployer tiene LEMON. Si el Deployer es admin, puede otorgar roles o mintear.');
  } else {
    console.log('>>> ADVERTENCIA: Ninguna wallet tiene LEMON para gas.');
  }
  
  console.log('');
}

main().catch(console.error);
