const https = require('https');

const VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';
const MINTER_ADDRESS = '0xaccA35529b2FC2041dFb124F83f52120E24377B2';
const DEPLOYER_WALLET = '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559';

// Role hashes
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';

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

async function checkRole(roleHash, address, roleName) {
  const hasRoleData = '0x91d14854' + 
    roleHash.slice(2).padStart(64, '0') +
    address.slice(2).toLowerCase().padStart(64, '0');
  
  const result = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: hasRoleData
  }, 'latest']);
  
  if (result.result) {
    const hasRole = result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    return hasRole;
  }
  return false;
}

async function main() {
  console.log('');
  console.log('================================================================================');
  console.log('         VERIFICACION ADMIN/OWNER DEL CONTRATO VUSD - LEMONCHAIN');
  console.log('================================================================================');
  console.log('');
  console.log('VUSD Contract: ' + VUSD_CONTRACT);
  console.log('');
  
  // Verificar owner() - 0x8da5cb5b
  console.log('VERIFICANDO OWNER (Ownable pattern):');
  console.log('--------------------------------------------------------------------------------');
  
  const ownerResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: '0x8da5cb5b'
  }, 'latest']);
  
  if (ownerResult.result && ownerResult.result.length === 66) {
    const owner = '0x' + ownerResult.result.slice(26);
    console.log('  owner(): ' + owner);
  } else {
    console.log('  owner(): No disponible o error');
  }
  
  // Verificar DEFAULT_ADMIN_ROLE para varias direcciones
  console.log('');
  console.log('VERIFICANDO DEFAULT_ADMIN_ROLE (AccessControl pattern):');
  console.log('--------------------------------------------------------------------------------');
  
  const addressesToCheck = [
    { name: 'Deployer', address: DEPLOYER_WALLET },
    { name: 'Minter Contract', address: MINTER_ADDRESS },
    { name: 'VUSD Contract itself', address: VUSD_CONTRACT },
    { name: 'Zero Address', address: '0x0000000000000000000000000000000000000000' }
  ];
  
  for (const item of addressesToCheck) {
    const hasAdmin = await checkRole(DEFAULT_ADMIN_ROLE, item.address, 'DEFAULT_ADMIN_ROLE');
    const hasMinter = await checkRole(MINTER_ROLE, item.address, 'MINTER_ROLE');
    console.log('  ' + item.name.padEnd(25) + item.address);
    console.log('    - DEFAULT_ADMIN_ROLE: ' + (hasAdmin ? 'SI' : 'NO'));
    console.log('    - MINTER_ROLE:        ' + (hasMinter ? 'SI' : 'NO'));
    console.log('');
  }
  
  // Verificar getRoleAdmin para MINTER_ROLE - 0x248a9ca3
  console.log('VERIFICANDO ROLE ADMIN PARA MINTER_ROLE:');
  console.log('--------------------------------------------------------------------------------');
  
  const getRoleAdminData = '0x248a9ca3' + MINTER_ROLE.slice(2);
  const roleAdminResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: getRoleAdminData
  }, 'latest']);
  
  if (roleAdminResult.result) {
    console.log('  getRoleAdmin(MINTER_ROLE): ' + roleAdminResult.result);
    if (roleAdminResult.result === DEFAULT_ADMIN_ROLE) {
      console.log('  -> El admin de MINTER_ROLE es DEFAULT_ADMIN_ROLE');
    }
  }
  
  // Verificar getRoleMemberCount para DEFAULT_ADMIN_ROLE - 0xca15c873
  console.log('');
  console.log('VERIFICANDO MIEMBROS DE DEFAULT_ADMIN_ROLE:');
  console.log('--------------------------------------------------------------------------------');
  
  const getRoleMemberCountData = '0xca15c873' + DEFAULT_ADMIN_ROLE.slice(2);
  const memberCountResult = await rpcCall('eth_call', [{
    to: VUSD_CONTRACT,
    data: getRoleMemberCountData
  }, 'latest']);
  
  if (memberCountResult.result) {
    const count = parseInt(memberCountResult.result, 16);
    console.log('  Numero de admins: ' + count);
    
    // getRoleMember(role, index) - 0x9010d07c
    for (let i = 0; i < count && i < 10; i++) {
      const getRoleMemberData = '0x9010d07c' + 
        DEFAULT_ADMIN_ROLE.slice(2) +
        i.toString(16).padStart(64, '0');
      
      const memberResult = await rpcCall('eth_call', [{
        to: VUSD_CONTRACT,
        data: getRoleMemberData
      }, 'latest']);
      
      if (memberResult.result && memberResult.result.length === 66) {
        const member = '0x' + memberResult.result.slice(26);
        console.log('  Admin #' + i + ': ' + member);
      }
    }
  } else {
    console.log('  getRoleMemberCount no disponible (puede no usar AccessControlEnumerable)');
  }
  
  console.log('');
  console.log('================================================================================');
  console.log('');
}

main().catch(console.error);
