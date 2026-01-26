/**
 * ESTRATEGIA PARA OBTENER NUEVO TOKEN Y EJECUTAR PAGO
 * =====================================================
 * 
 * Si los permisos fueron actualizados en el portal de Sberbank,
 * necesitamos obtener un nuevo token que incluya esos permisos.
 */

import https from 'https';
import fs from 'fs';
import crypto from 'crypto';

// Configuración
const CONFIG = {
  clientId: '25190',
  authUrl: 'https://sbi.sberbank.ru:9443',
  apiUrl: 'https://fintech.sberbank.ru:9443/fintech',
  
  // Certificado P12
  p12Path: 'C:/Users/USER/Desktop/SBANKCARD/12/2_5445145381656632204.p12',
  p12Password: 'Happy707Happy',
  
  // CA Certificates
  caPath: 'C:/Users/USER/Desktop/SBANKCARD/2b1cfb94_prom-certs/prom-certs',
  
  // Token actual (puede estar expirado o sin permisos)
  currentToken: 'cD3Ed0e541DEAAb2B9377bC5DEe9058eaA8DAC',
  refreshToken: 'ee6AD4c5e7D67eC4E4BEBAba26E5aBCEA0B479',
  
  // Scopes requeridos para pagos
  scopes: [
    'openid',
    'PAY_DOC_RU',
    'PAY_DOC_CUR',
    'GET_CLIENT_ACCOUNTS',
    'GET_STATEMENT_ACCOUNT',
    'BANK_CONTROL_STATEMENT'
  ].join(' ')
};

// Cargar certificados
let httpsAgent;
try {
  const p12Buffer = fs.readFileSync(CONFIG.p12Path);
  const caFiles = fs.readdirSync(CONFIG.caPath)
    .filter(f => f.endsWith('.cer') || f.endsWith('.crt'))
    .map(f => fs.readFileSync(`${CONFIG.caPath}/${f}`));
  
  httpsAgent = new https.Agent({
    pfx: p12Buffer,
    passphrase: CONFIG.p12Password,
    ca: caFiles,
    rejectUnauthorized: false
  });
  
  console.log('✅ Certificados cargados correctamente');
} catch (error) {
  console.error('❌ Error cargando certificados:', error.message);
  process.exit(1);
}

// Función para hacer requests HTTPS
async function httpsRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, agent: httpsAgent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// ESTRATEGIA 1: Intentar refrescar el token
async function refreshToken() {
  console.log('\n📋 ESTRATEGIA 1: Refrescar Token');
  console.log('================================');
  
  const tokenData = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: CONFIG.refreshToken,
    client_id: CONFIG.clientId,
    scope: CONFIG.scopes
  });
  
  try {
    const response = await httpsRequest(
      `${CONFIG.authUrl}/ic/sso/api/v2/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      },
      tokenData.toString()
    );
    
    console.log('Status:', response.status);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      console.log('✅ Token refrescado!');
      console.log('Nuevo access_token:', data.access_token?.slice(0, 20) + '...');
      console.log('Expira en:', data.expires_in, 'segundos');
      return data;
    } else {
      console.log('❌ Error:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return null;
  }
}

// ESTRATEGIA 2: Usar el token actual y probar el pago
async function testPayment(accessToken) {
  console.log('\n📋 ESTRATEGIA 2: Probar Pago con Token');
  console.log('======================================');
  
  const externalId = crypto.randomUUID();
  const payment = {
    externalId: externalId,
    amount: '10000.00',
    date: new Date().toISOString().split('T')[0],
    operationCode: '01',
    priority: 5,
    purpose: 'Тестовый платеж API - проверка полномочий',
    
    // Pagador
    payerAccount: '40702810669000001880',
    payerName: 'ООО "ПОИНТЕР"',
    payerInn: '7328077215',
    payerKpp: '732801001',
    payerBankBic: '047308602',
    payerBankCorrAccount: '30101810000000000602',
    
    // Beneficiario
    payeeAccount: '30101810000000000602',
    payeeName: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
    payeeInn: '7707083893',
    payeeKpp: '732502002',
    payeeBankBic: '047308602',
    payeeBankCorrAccount: '30101810000000000602'
  };
  
  console.log('Payment ID:', externalId);
  console.log('Amount:', payment.amount, 'RUB');
  console.log('From:', payment.payerAccount);
  console.log('To:', payment.payeeAccount);
  
  try {
    const response = await httpsRequest(
      `${CONFIG.apiUrl}/api/v1/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-ID': externalId,
          'X-IBM-Client-Id': CONFIG.clientId
        }
      },
      JSON.stringify(payment)
    );
    
    console.log('\nResponse Status:', response.status);
    
    try {
      const data = JSON.parse(response.data);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (response.status >= 200 && response.status < 300) {
        console.log('\n✅ ¡PAGO EXITOSO!');
        return { success: true, data };
      } else if (data.cause === 'ACTION_ACCESS_EXCEPTION') {
        console.log('\n⚠️ Error de permisos - El token no tiene autorización para pagos');
        console.log('Mensaje:', data.message);
        return { success: false, error: 'PERMISSION_DENIED', data };
      } else {
        console.log('\n❌ Error:', data.message || data.cause);
        return { success: false, data };
      }
    } catch (e) {
      console.log('Response (raw):', response.data.substring(0, 500));
      return { success: false, error: 'PARSE_ERROR' };
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return { success: false, error: error.message };
  }
}

// ESTRATEGIA 3: Generar URL de autorización para obtener nuevo token
function generateAuthUrl() {
  console.log('\n📋 ESTRATEGIA 3: URL de Autorización Manual');
  console.log('============================================');
  
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CONFIG.clientId,
    redirect_uri: 'http://localhost:3001/api/sber-business/callback',
    scope: CONFIG.scopes,
    state: state,
    nonce: nonce
  });
  
  const authUrl = `${CONFIG.authUrl}/ic/sso/api/v2/oauth/authorize?${params.toString()}`;
  
  console.log('\n🔗 URL de Autorización:');
  console.log('─'.repeat(80));
  console.log(authUrl);
  console.log('─'.repeat(80));
  console.log('\nInstrucciones:');
  console.log('1. Abre esta URL en un navegador');
  console.log('2. Inicia sesión con las credenciales de SberBusiness');
  console.log('3. Autoriza la aplicación');
  console.log('4. El navegador redirigirá a localhost:3001 con el código');
  console.log('5. El servidor intercambiará el código por un nuevo token');
  
  return authUrl;
}

// Ejecutar estrategias
async function main() {
  console.log('═'.repeat(60));
  console.log('  SBERBANK API - ESTRATEGIA DE CONEXIÓN');
  console.log('═'.repeat(60));
  console.log('Fecha:', new Date().toISOString());
  console.log('Client ID:', CONFIG.clientId);
  
  // Estrategia 1: Intentar refrescar
  const newToken = await refreshToken();
  
  let tokenToUse = newToken?.access_token || CONFIG.currentToken;
  
  // Estrategia 2: Probar pago
  const paymentResult = await testPayment(tokenToUse);
  
  if (!paymentResult.success) {
    // Estrategia 3: Mostrar URL de autorización
    generateAuthUrl();
    
    console.log('\n═'.repeat(60));
    console.log('  RESUMEN');
    console.log('═'.repeat(60));
    console.log('El pago no se pudo completar.');
    console.log('Si el error es de permisos, necesitas:');
    console.log('1. Ir al portal SberBusiness Online');
    console.log('2. Verificar que PAY_DOC_RU está habilitado para API');
    console.log('3. Obtener un nuevo token usando la URL de arriba');
  }
}

main().catch(console.error);
