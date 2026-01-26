/**
 * PRUEBA DE TODOS LOS ENDPOINTS POSIBLES DE SBERBANK
 * ===================================================
 */

import https from 'https';
import fs from 'fs';
import crypto from 'crypto';

const CONFIG = {
  clientId: '25190',
  apiUrl: 'https://fintech.sberbank.ru:9443',
  token: 'cD3Ed0e541DEAAb2B9377bC5DEe9058eaA8DAC',
  p12Path: 'C:/Users/USER/Desktop/SBANKCARD/12/2_5445145381656632204.p12',
  p12Password: 'Happy707Happy',
  caPath: 'C:/Users/USER/Desktop/SBANKCARD/2b1cfb94_prom-certs/prom-certs',
};

// Cargar certificados
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

async function httpsRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, agent: httpsAgent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
    if (postData) req.write(postData);
    req.end();
  });
}

// Datos del pago
const externalId = crypto.randomUUID();
const today = new Date().toISOString().split('T')[0];

// Diferentes formatos de payload
const payloads = {
  // Formato 1: Flat (campos directos)
  flat: {
    externalId,
    amount: '10000.00',
    date: today,
    operationCode: '01',
    priority: 5,
    purpose: 'Тестовый платеж API',
    payerAccount: '40702810669000001880',
    payerName: 'ООО "ПОИНТЕР"',
    payerInn: '7328077215',
    payerKpp: '732801001',
    payerBankBic: '047308602',
    payerBankCorrAccount: '30101810000000000602',
    payeeAccount: '30101810000000000602',
    payeeName: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
    payeeInn: '7707083893',
    payeeKpp: '732502002',
    payeeBankBic: '047308602',
    payeeBankCorrAccount: '30101810000000000602'
  },
  
  // Formato 2: Con objetos anidados payer/payee
  nested: {
    externalId,
    amount: '10000.00',
    date: today,
    operationCode: '01',
    priority: 5,
    purpose: 'Тестовый платеж API',
    payer: {
      account: '40702810669000001880',
      name: 'ООО "ПОИНТЕР"',
      inn: '7328077215',
      kpp: '732801001',
      bankBic: '047308602',
      bankCorrAccount: '30101810000000000602'
    },
    payee: {
      account: '30101810000000000602',
      name: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
      inn: '7707083893',
      kpp: '732502002',
      bankBic: '047308602',
      bankCorrAccount: '30101810000000000602'
    }
  },
  
  // Formato 3: Documento de pago estilo SBBOL
  document: {
    documentId: externalId,
    documentNumber: String(Date.now()).slice(-8),
    documentDate: today,
    documentType: 'PAY_DOC_RU',
    amount: 10000.00,
    currency: 'RUB',
    priority: '5',
    purpose: 'Тестовый платеж API',
    payer: {
      accountNumber: '40702810669000001880',
      name: 'ООО "ПОИНТЕР"',
      inn: '7328077215',
      kpp: '732801001',
      bank: {
        bic: '047308602',
        corrAccount: '30101810000000000602',
        name: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК'
      }
    },
    payee: {
      accountNumber: '30101810000000000602',
      name: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
      inn: '7707083893',
      kpp: '732502002',
      bank: {
        bic: '047308602',
        corrAccount: '30101810000000000602',
        name: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК'
      }
    }
  },

  // Formato 4: Mínimo requerido
  minimal: {
    externalId,
    amount: '10000.00',
    date: today,
    purpose: 'Тестовый платеж',
    payerAccount: '40702810669000001880',
    payeeAccount: '30101810000000000602',
    payeeBankBic: '047308602'
  }
};

// Endpoints a probar
const endpoints = [
  '/fintech/api/v1/payments',
  '/fintech/api/v1/pay-doc-ru',
  '/fintech/api/v1/payment-orders',
  '/fintech/api/v1/rpc/create-payment',
  '/fintech/api/v1/sbbol/payments',
  '/fintech/api/v2/payments',
  '/ic/sso/api/v1/payments',
  '/api/v1/payments',
];

async function testEndpoint(endpoint, payloadName, payload) {
  const url = `${CONFIG.apiUrl}${endpoint}`;
  
  try {
    const response = await httpsRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CONFIG.token}`,
        'X-Request-ID': crypto.randomUUID(),
        'X-IBM-Client-Id': CONFIG.clientId
      }
    }, JSON.stringify(payload));
    
    let result;
    try {
      result = JSON.parse(response.data);
    } catch {
      result = response.data.substring(0, 200);
    }
    
    return {
      endpoint,
      payloadName,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      error: result.cause || result.message || null,
      result
    };
  } catch (error) {
    return {
      endpoint,
      payloadName,
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  SBERBANK API - PRUEBA DE ENDPOINTS Y FORMATOS');
  console.log('═'.repeat(70));
  console.log('Token:', CONFIG.token.slice(0, 15) + '...');
  console.log('Fecha:', new Date().toISOString());
  console.log();

  const results = [];
  
  // Probar cada endpoint con el payload flat primero
  console.log('Probando endpoints con payload flat...\n');
  
  for (const endpoint of endpoints) {
    process.stdout.write(`  ${endpoint.padEnd(45)}`);
    const result = await testEndpoint(endpoint, 'flat', payloads.flat);
    results.push(result);
    
    if (result.status === 0) {
      console.log(`❌ Error: ${result.error}`);
    } else if (result.success) {
      console.log(`✅ ${result.status} - ÉXITO!`);
    } else if (result.status === 404) {
      console.log(`⚪ 404 - No existe`);
    } else if (result.status === 403) {
      console.log(`🟡 403 - ${result.error || 'Sin permiso'}`);
    } else if (result.status === 400) {
      console.log(`🔵 400 - ${result.error || 'Error validación'}`);
    } else {
      console.log(`🔴 ${result.status} - ${result.error || 'Error'}`);
    }
  }

  // Buscar el mejor endpoint (el que responde con 403 o 400, no 404)
  const workingEndpoints = results.filter(r => r.status === 403 || r.status === 400);
  
  if (workingEndpoints.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('Endpoints que responden (probando diferentes formatos):');
    console.log('─'.repeat(70));
    
    for (const working of workingEndpoints) {
      console.log(`\n📍 ${working.endpoint}`);
      
      for (const [name, payload] of Object.entries(payloads)) {
        if (name === 'flat') continue; // Ya probado
        
        process.stdout.write(`   Formato ${name.padEnd(12)}: `);
        const result = await testEndpoint(working.endpoint, name, payload);
        
        if (result.success) {
          console.log(`✅ ÉXITO!`);
          console.log('\n🎉 ¡PAGO EXITOSO!');
          console.log('Resultado:', JSON.stringify(result.result, null, 2));
          return;
        } else if (result.status === 400) {
          console.log(`🔵 400 - Validación: ${result.error}`);
        } else if (result.status === 403) {
          console.log(`🟡 403 - Permiso: ${result.error}`);
        } else {
          console.log(`🔴 ${result.status}`);
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('  RESUMEN');
  console.log('═'.repeat(70));
  
  const successCount = results.filter(r => r.success).length;
  const permissionErrors = results.filter(r => r.status === 403).length;
  const validationErrors = results.filter(r => r.status === 400).length;
  const notFound = results.filter(r => r.status === 404).length;
  
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`🟡 Errores de permiso (403): ${permissionErrors}`);
  console.log(`🔵 Errores de validación (400): ${validationErrors}`);
  console.log(`⚪ No encontrados (404): ${notFound}`);
  
  if (permissionErrors > 0 && successCount === 0) {
    console.log('\n⚠️  El token es válido pero NO tiene permisos para crear pagos.');
    console.log('   Necesitas habilitar PAY_DOC_RU en el portal de SberBusiness.');
  }
}

main().catch(console.error);
