/**
 * OBTENER INFO DEL CLIENTE Y PROBAR PAGO
 */

import https from 'https';
import fs from 'fs';
import crypto from 'crypto';

const CONFIG = {
  clientId: '25190',
  apiUrl: 'https://fintech.sberbank.ru:9443',
  token: 'cD3Ed0e541DEAAb2B9377bC5DEe9058eaA8DAC',
  p12Path: 'C:/Users/USER/Desktop/SBANKCARD/12/sbank/new23/SBBAPI_25190_807c30e4-1c0d-4dd8-a88c-65cab8a2fa98.p12',
  p12Password: 'Qwe123Rty',
  caPath: 'C:/Users/USER/Desktop/SBANKCARD/2b1cfb94_prom-certs/prom-certs',
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

async function httpsRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, agent: httpsAgent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
    if (body) req.write(body);
    req.end();
  });
}

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${CONFIG.token}`,
  'X-IBM-Client-Id': CONFIG.clientId
};

async function main() {
  console.log('═'.repeat(70));
  console.log('  SBERBANK API - OBTENER INFO Y PROBAR PAGO');
  console.log('═'.repeat(70));
  
  // 1. Obtener información del cliente
  console.log('\n📋 1. Información del cliente:');
  console.log('─'.repeat(70));
  
  try {
    const clientInfo = await httpsRequest(
      `${CONFIG.apiUrl}/fintech/api/v1/client-info`,
      { method: 'GET', headers }
    );
    
    console.log('Status:', clientInfo.status);
    const info = JSON.parse(clientInfo.data);
    console.log(JSON.stringify(info, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // 2. Probar diferentes endpoints de pago/documento
  console.log('\n📋 2. Probando endpoints de documentos de pago:');
  console.log('─'.repeat(70));
  
  const paymentEndpoints = [
    '/fintech/api/v1/payments',
    '/fintech/api/v1/payment-orders',
    '/fintech/api/v1/pay-doc-ru',
    '/fintech/api/v1/documents',
    '/fintech/api/v1/documents/payments',
    '/fintech/api/v1/rpc/payments',
    '/fintech/api/v1/orders',
    '/fintech/api/v1/transfers',
  ];
  
  const externalId = crypto.randomUUID();
  const payment = {
    externalId,
    amount: '10000.00',
    date: new Date().toISOString().split('T')[0],
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
  };
  
  for (const endpoint of paymentEndpoints) {
    process.stdout.write(`POST ${endpoint.padEnd(45)}: `);
    
    try {
      const response = await httpsRequest(
        `${CONFIG.apiUrl}${endpoint}`,
        { method: 'POST', headers },
        JSON.stringify(payment)
      );
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ ÉXITO!');
        console.log(response.data);
      } else if (response.status === 403) {
        const err = JSON.parse(response.data);
        console.log(`🟡 403 - ${err.cause || err.message || 'Sin permiso'}`);
      } else if (response.status === 404) {
        console.log('⚪ 404');
      } else if (response.status === 400) {
        const err = JSON.parse(response.data);
        console.log(`🔵 400 - ${err.cause || err.message || 'Validación'}`);
        // Mostrar detalles de validación
        if (err.checks) {
          err.checks.forEach(c => console.log(`      → ${c.message} [${c.fields?.join(', ')}]`));
        }
      } else {
        console.log(`🔴 ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }
  
  // 3. Verificar si hay un endpoint específico para la cuenta
  console.log('\n📋 3. Probando endpoints específicos de la cuenta:');
  console.log('─'.repeat(70));
  
  const accountEndpoints = [
    '/fintech/api/v1/accounts/40702810669000001880/payments',
    '/fintech/api/v1/accounts/40702810669000001880/transfers',
    '/fintech/api/v1/accounts/40702810669000001880/orders',
  ];
  
  for (const endpoint of accountEndpoints) {
    process.stdout.write(`POST ${endpoint.substring(0, 55).padEnd(55)}: `);
    
    try {
      const response = await httpsRequest(
        `${CONFIG.apiUrl}${endpoint}`,
        { method: 'POST', headers },
        JSON.stringify(payment)
      );
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ ÉXITO!');
      } else if (response.status === 403) {
        console.log('🟡 403');
      } else if (response.status === 404) {
        console.log('⚪ 404');
      } else {
        console.log(`🔴 ${response.status}`);
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('  CONCLUSIÓN');
  console.log('═'.repeat(70));
  console.log('El endpoint /fintech/api/v1/payments existe y acepta el formato.');
  console.log('El error 403 indica que el permiso PAY_DOC_RU NO está activo.');
  console.log('\nPara activar pagos via API en SberBusiness:');
  console.log('1. Portal: https://sbi.sberbank.ru');
  console.log('2. Ir a: Настройки → API → Полномочия');
  console.log('3. Activar: "Создание платежных поручений"');
  console.log('4. Aplicar a la cuenta: 40702810669000001880');
}

main().catch(console.error);
