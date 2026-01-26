/**
 * VERIFICAR QUÉ OPERACIONES ESTÁN PERMITIDAS CON EL TOKEN ACTUAL
 */

import https from 'https';
import fs from 'fs';

const CONFIG = {
  clientId: '25190',
  apiUrl: 'https://fintech.sberbank.ru:9443',
  token: 'cD3Ed0e541DEAAb2B9377bC5DEe9058eaA8DAC',
  p12Path: 'C:/Users/USER/Desktop/SBANKCARD/12/2_5445145381656632204.p12',
  p12Password: 'Happy707Happy',
  caPath: 'C:/Users/USER/Desktop/SBANKCARD/2b1cfb94_prom-certs/prom-certs',
  account: '40702810669000001880'
};

const p12Buffer = fs.readFileSync(CONFIG.p12Path);
const caFiles = fs.readdirSync(CONFIG.caPath)
  .filter(f => f.endsWith('.cer') || f.endsWith('.crt'))
  .map(f => fs.readFileSync(`${CONFIG.caPath}/${f}`));

const httpsAgent = new https.Agent({
  pfx: p12Buffer,
  passphrase: CONFIG.p12Password,
  ca: caFiles,
  rejectUnauthorized: false
});

async function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, agent: httpsAgent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
    req.end();
  });
}

const headers = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${CONFIG.token}`,
  'X-IBM-Client-Id': CONFIG.clientId
};

// Endpoints de LECTURA para verificar permisos
const readEndpoints = [
  { name: 'Cuentas del cliente', path: '/fintech/api/v1/client-info' },
  { name: 'Lista de cuentas', path: '/fintech/api/v1/accounts' },
  { name: 'Info de cuenta', path: `/fintech/api/v1/accounts/${CONFIG.account}` },
  { name: 'Balance', path: `/fintech/api/v1/accounts/${CONFIG.account}/balance` },
  { name: 'Statement', path: `/fintech/api/v1/statement?accountNumber=${CONFIG.account}` },
  { name: 'Extracto', path: `/fintech/api/v1/statements?account=${CONFIG.account}` },
  { name: 'Transacciones', path: `/fintech/api/v1/transactions?account=${CONFIG.account}` },
  { name: 'Permisos', path: '/fintech/api/v1/permissions' },
  { name: 'Scopes', path: '/fintech/api/v1/scopes' },
  { name: 'User Info', path: '/fintech/api/v1/user-info' },
  { name: 'Health', path: '/fintech/api/v1/health' },
  { name: 'Version', path: '/fintech/api/v1/version' },
  { name: 'Diccionarios', path: '/fintech/api/v1/dictionaries' },
  { name: 'Bancos', path: '/fintech/api/v1/banks' },
  { name: 'Corresponsales', path: '/fintech/api/v1/correspondents' },
];

async function main() {
  console.log('═'.repeat(70));
  console.log('  VERIFICACIÓN DE PERMISOS DEL TOKEN');
  console.log('═'.repeat(70));
  console.log('Token:', CONFIG.token.slice(0, 20) + '...');
  console.log('Cuenta:', CONFIG.account);
  console.log();
  
  let allowedOps = [];
  let deniedOps = [];
  
  for (const ep of readEndpoints) {
    process.stdout.write(`${ep.name.padEnd(25)}: `);
    
    try {
      const response = await httpsRequest(`${CONFIG.apiUrl}${ep.path}`, {
        method: 'GET',
        headers
      });
      
      if (response.status === 200) {
        console.log('✅ PERMITIDO');
        allowedOps.push(ep.name);
        
        // Mostrar datos si es información útil
        try {
          const data = JSON.parse(response.data);
          if (ep.name.includes('Balance') || ep.name.includes('cuenta')) {
            console.log('   Datos:', JSON.stringify(data).substring(0, 100) + '...');
          }
        } catch {}
        
      } else if (response.status === 403) {
        console.log('🟡 Sin permiso');
        deniedOps.push(ep.name);
      } else if (response.status === 404) {
        console.log('⚪ No existe');
      } else {
        console.log(`🔴 ${response.status}`);
        try {
          const err = JSON.parse(response.data);
          if (err.message) console.log(`   ${err.message.substring(0, 60)}`);
        } catch {}
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('  RESUMEN DE PERMISOS');
  console.log('═'.repeat(70));
  
  if (allowedOps.length > 0) {
    console.log('\n✅ Operaciones PERMITIDAS:');
    allowedOps.forEach(op => console.log(`   - ${op}`));
  }
  
  if (deniedOps.length > 0) {
    console.log('\n🟡 Operaciones DENEGADAS:');
    deniedOps.forEach(op => console.log(`   - ${op}`));
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('CONCLUSIÓN:');
  console.log('─'.repeat(70));
  
  if (allowedOps.length === 0) {
    console.log('❌ El token NO tiene permisos para ninguna operación de lectura.');
    console.log('   Esto sugiere que el token necesita ser re-emitido con los scopes correctos.');
  } else {
    console.log(`✅ El token tiene ${allowedOps.length} operaciones permitidas.`);
    console.log('   Para pagos (PAY_DOC_RU), necesitas verificar en el portal de SberBusiness:');
    console.log('   1. Настройки API → Полномочия');
    console.log('   2. Asegúrate de que "Создание платежей" está habilitado');
    console.log('   3. Verifica que la cuenta 40702810669000001880 permite operaciones API');
  }
}

main().catch(console.error);
