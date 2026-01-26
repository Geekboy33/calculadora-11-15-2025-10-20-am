const https = require('https');

const contracts = {
  'VUSD Token': '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  'PriceOracle': '0x56D445518ee72D979ec3DBCbc4B20f0A71D4aC5d',
  'USD Tokenized': '0x7476B58f954C19dfE677407fA3e178D8f173BcD0',
  'LockReserve': '0x154403841e99479E9F628E9F01619A4Bcc394f8a',
  'VUSDMinter': '0xC59D560025cdDe01E7d813575987E1E902bE2619',
  'LockBox': '0xD0A4e3a716def7C66507f7C11A616798bdDF8874',
  'CustodyVault': '0xe6f7AF72E87E58191Db058763aFB53292a72a25E',
  'LocksTreasuryVUSD': '0xa5288fD531D1e6dF8C1311aF9Fea473AcD380FdB',
  'VUSDMinting': '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
  'MintingBridge': '0x3C3f9DC11b067366CE3bEfd10D5746AAEaA25e99'
};

const wallets = {
  'Deployer (Admin)': '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
  'ETH Wallet (.env)': '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
  'Beneficiary': '0x00Ae97dab25727c1567E9A080Bc24C5Ee9256922'
};

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
  console.log('      VERIFICACION DE CONTRATOS Y WALLETS - LEMONCHAIN (Chain ID: 1006)');
  console.log('================================================================================');
  console.log('');
  
  console.log('SMART CONTRACTS:');
  console.log('--------------------------------------------------------------------------------');
  
  for (const [name, address] of Object.entries(contracts)) {
    try {
      const result = await rpcCall('eth_getCode', [address, 'latest']);
      const hasCode = result.result && result.result !== '0x' && result.result.length > 4;
      const status = hasCode ? 'DEPLOYED' : 'NOT DEPLOYED';
      const icon = hasCode ? '[OK]' : '[NO]';
      console.log('  ' + icon + ' ' + name.padEnd(22) + address + '  ' + status);
    } catch(e) {
      console.log('  [??] ' + name.padEnd(22) + address + '  ERROR');
    }
  }
  
  console.log('');
  console.log('WALLETS:');
  console.log('--------------------------------------------------------------------------------');
  
  for (const [name, address] of Object.entries(wallets)) {
    try {
      const result = await rpcCall('eth_getBalance', [address, 'latest']);
      const balance = parseInt(result.result, 16) / 1e18;
      console.log('  ' + name.padEnd(22) + address + '  Balance: ' + balance.toFixed(6) + ' LEMON');
    } catch(e) {
      console.log('  ' + name.padEnd(22) + address + '  ERROR');
    }
  }
  
  console.log('');
  console.log('================================================================================');
  console.log('');
}

main();
