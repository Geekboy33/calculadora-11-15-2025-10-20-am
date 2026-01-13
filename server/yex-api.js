/**
 * 🔀 YEX API - Módulo Backend
 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};





 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};



 * 
 * ✅ Autenticación HMAC SHA256
 * ✅ Endpoints OpenAPI
 * ✅ Rate Limiting
 * ✅ Manejo de errores
 */

import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const YEX_CONFIG = {
  baseUrl: process.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
  apiKey: process.env.VITE_YEX_API_KEY || '',
  secretKey: process.env.VITE_YEX_SECRET_KEY || '',
  recvWindow: 5000
};

/**
 * ✅ Generar firma HMAC SHA256 según documentación YEX
 * Firma = HMAC SHA256(timestamp + method + requestPath + body, secretKey)
 * Documentación: https://docs.yex.io/
 */
function generateSignature(timestamp, method, requestPath, body = '') {
  // Según docs: timestamp + method + requestPath + body string
  const message = timestamp + method + requestPath + body;
  
  const signature = crypto
    .createHmac('sha256', YEX_CONFIG.secretKey)
    .update(message)
    .digest('hex');
  
  return signature;
}

/**
 * ✅ Crear headers para YEX según documentación oficial
 * Headers requeridos: X-CH-APIKEY, X-CH-SIGN, X-CH-TS, Content-Type
 * Documentación: https://docs.yex.io/
 */
function createHeaders(method, requestPath, body = '') {
  // Timestamp en milisegundos como número (según documentación)
  const timestampMs = Date.now();
  // Para la firma y header, usar como string
  const timestamp = timestampMs.toString();
  
  // Method debe ser en mayúsculas: GET/POST (según documentación)
  const methodUpper = method.toUpperCase();
  
  // Generar firma: timestamp + method + requestPath + body
  // Según docs: HMAC SHA256(timestamp + method + requestPath + body, secretKey)
  const signature = generateSignature(timestamp, methodUpper, requestPath, body);

  return {
    'X-CH-APIKEY': YEX_CONFIG.apiKey,
    'X-CH-SIGN': signature,
    'X-CH-TS': timestamp, // String del timestamp en milisegundos
    'Content-Type': 'application/json'
  };
}

/**
 * ✅ GET Request a YEX
 * Para GET, los parámetros van en query string (según documentación)
 */
async function yexGet(endpoint, params = {}) {
  try {
    // Construir query string
    const queryString = new URLSearchParams(params).toString();
    const requestPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    const url = `${YEX_CONFIG.baseUrl}${requestPath}`;
    
    // Para GET, body es string vacío, pero requestPath incluye query string
    const headers = createHeaders('GET', requestPath, '');

    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX GET Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * ✅ POST Request a YEX
 * Para POST, los parámetros van en el body (según documentación)
 */
async function yexPost(endpoint, data = {}) {
  try {
    const url = `${YEX_CONFIG.baseUrl}${endpoint}`;
    // Body debe ser string JSON para la firma
    const body = JSON.stringify(data);
    
    // Para POST, requestPath es solo el endpoint, body es el JSON string
    const headers = createHeaders('POST', endpoint, body);

    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('❌ YEX POST Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * 📊 FUNCIONES DE MERCADO
 */

// Obtener ticker de símbolo
async function getTicket(symbol) {
  try {
    console.log(`📊 Obteniendo ticket para ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/24hr', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo ticket:`, error.message);
    throw error;
  }
}

// Obtener precio actual
async function getPrice(symbol) {
  try {
    console.log(`💰 Obteniendo precio de ${symbol}...`);
    const result = await yexGet('/sapi/v1/ticker/price', { symbol });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo precio:`, error.message);
    throw error;
  }
}

// Obtener órdenes abiertas
async function getOpenOrders(symbol = '') {
  try {
    console.log(`📋 Obteniendo órdenes abiertas...`);
    const params = {};
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/openOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo órdenes:`, error.message);
    throw error;
  }
}

// Obtener órdenes completadas
async function getOrderHistory(symbol = '', limit = 10) {
  try {
    console.log(`📋 Obteniendo historial de órdenes...`);
    const params = { limit };
    if (symbol) params.symbol = symbol;
    
    const result = await yexGet('/sapi/v1/allOrders', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial:`, error.message);
    throw error;
  }
}

/**
 * 💳 FUNCIONES DE TRADING
 */

// Crear orden
// Según documentación YEX: symbol, side, type, volume, price
async function createOrder(orderData) {
  try {
    console.log(`📝 Creando orden...`, orderData);
    
    // Convertir quantity a volume si existe (según documentación YEX usa 'volume')
    const orderPayload = { ...orderData };
    if (orderPayload.quantity !== undefined && !orderPayload.volume) {
      orderPayload.volume = orderPayload.quantity;
      delete orderPayload.quantity;
    }
    
    const result = await yexPost('/sapi/v1/order', orderPayload);
    return result;
  } catch (error) {
    console.error(`❌ Error creando orden:`, error.message);
    throw error;
  }
}

// Cancelar orden
async function cancelOrder(symbol, orderId) {
  try {
    console.log(`❌ Cancelando orden ${orderId}...`);
    const result = await yexPost('/sapi/v1/order/cancel', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error cancelando orden:`, error.message);
    throw error;
  }
}

// Obtener detalles de orden
async function getOrderDetails(symbol, orderId) {
  try {
    console.log(`📋 Obteniendo detalles de orden...`);
    const result = await yexGet('/sapi/v1/order', {
      symbol,
      orderId
    });
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles:`, error.message);
    throw error;
  }
}

/**
 * 👤 FUNCIONES DE CUENTA
 */

// Obtener balance de cuenta
async function getAccountBalance() {
  try {
    console.log(`💰 Obteniendo balance de cuenta...`);
    const result = await yexGet('/sapi/v1/account');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo balance:`, error.message);
    throw error;
  }
}

// Obtener información de usuario
async function getUserInfo() {
  try {
    console.log(`👤 Obteniendo información de usuario...`);
    const result = await yexGet('/sapi/v1/user');
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo usuario:`, error.message);
    throw error;
  }
}

/**
 * 📈 FUNCIONES DE MARGEN
 */

// Obtener información de margen
async function getMarginInfo(asset = '') {
  try {
    console.log(`📊 Obteniendo información de margen...`);
    const params = {};
    if (asset) params.asset = asset;
    
    const result = await yexGet('/sapi/v1/margin/account', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo margen:`, error.message);
    throw error;
  }
}

/**
 * 📤 FUNCIONES DE RETIRO
 */

// Obtener historial de retiros
async function getWithdrawHistory(coin = '', limit = 10) {
  try {
    console.log(`📤 Obteniendo historial de retiros...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/withdraw/history', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo retiros:`, error.message);
    throw error;
  }
}

/**
 * 📥 FUNCIONES DE DEPÓSITO
 */

// Obtener dirección de depósito para una moneda específica
async function getDepositAddress(coin, network = '') {
  try {
    console.log(`📥 Obteniendo dirección de depósito para ${coin}...`);
    const params = { coin };
    if (network) params.network = network;
    
    const result = await yexGet('/sapi/v1/capital/deposit/address', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo dirección de depósito:`, error.message);
    throw error;
  }
}

// Obtener historial de depósitos
async function getDepositHistory(coin = '', limit = 10) {
  try {
    console.log(`📥 Obteniendo historial de depósitos...`);
    const params = { limit };
    if (coin) params.coin = coin;
    
    const result = await yexGet('/sapi/v1/capital/deposit/hisrec', params);
    return result;
  } catch (error) {
    console.error(`❌ Error obteniendo historial de depósitos:`, error.message);
    throw error;
  }
}

// Transferencia interna (entre cuentas spot/margin/futures)
async function internalTransfer(asset, amount, fromAccountType, toAccountType) {
  try {
    console.log(`🔄 Realizando transferencia interna de ${amount} ${asset}...`);
    const result = await yexPost('/sapi/v1/capital/transfer', {
      asset,
      amount: amount.toString(),
      fromAccountType,
      toAccountType
    });
    return result;
  } catch (error) {
    console.error(`❌ Error en transferencia interna:`, error.message);
    throw error;
  }
}

// Solicitar depósito (para integración con Custody)
async function requestDeposit(coin, amount, fromSource, txId = '') {
  try {
    console.log(`📥 Solicitando depósito de ${amount} ${coin} desde ${fromSource}...`);
    
    // Primero obtenemos la dirección de depósito
    const depositAddress = await getDepositAddress(coin);
    
    // Retornamos la información para que el usuario pueda hacer la transferencia
    return {
      success: true,
      coin,
      amount,
      fromSource,
      depositAddress: depositAddress.address || depositAddress,
      network: depositAddress.network || 'ERC20',
      memo: depositAddress.tag || depositAddress.memo || '',
      message: `Para completar el depósito, transfiere ${amount} ${coin} a la dirección indicada`,
      timestamp: Date.now(),
      txId: txId || `DEP-${Date.now()}`
    };
  } catch (error) {
    console.error(`❌ Error solicitando depósito:`, error.message);
    throw error;
  }
}

/**
 * ⚙️ FUNCIONES AUXILIARES
 */

// Validar configuración
function validateConfig() {
  if (!YEX_CONFIG.apiKey || !YEX_CONFIG.secretKey) {
    throw new Error('❌ YEX API Key y Secret Key no están configurados');
  }
  return true;
}

// Procesar errores de YEX según documentación
// https://docs.yex.io/
function handleYexError(error) {
  if (error.response?.data) {
    const data = error.response.data;
    const code = data.code;
    const msg = data.msg || 'Error desconocido';
    
    console.error(`❌ YEX Error [${code}]: ${msg}`);
    
    // Mapear errores según documentación YEX
    const errorMap = {
      '-1121': 'Símbolo inválido',
      '-1001': 'Desconexión',
      '429': 'Rate limit alcanzado (12,000/min IP o 60,000/min UID)',
      '410': 'Rate limit alcanzado',
      '418': 'IP bloqueada (bloqueo de 2 minutos a 3 días)',
      '504': 'Timeout - El estado de la operación es DESCONOCIDO',
      '-2015': 'Credenciales inválidas',
      '4XX': 'Error en la solicitud (malformada)',
      '5XX': 'Error interno del servidor'
    };
    
    // Si es un código HTTP, usar el código directamente
    if (error.response.status) {
      const statusCode = error.response.status.toString();
      if (errorMap[statusCode]) {
        return errorMap[statusCode];
      }
    }
    
    // Si es un código de error de YEX
    if (code && errorMap[code]) {
      return errorMap[code];
    }
    
    return msg;
  }
  
  // Error de red o sin respuesta
  if (error.message) {
    return error.message;
  }
  
  return 'Error desconocido al conectar con YEX API';
}


export default {
  // Config
  validateConfig,
  YEX_CONFIG,
  
  // Utilidades
  generateSignature,
  createHeaders,
  yexGet,
  yexPost,
  handleYexError,
  
  // Mercado
  getTicket,
  getPrice,
  getOpenOrders,
  getOrderHistory,
  
  // Trading
  createOrder,
  cancelOrder,
  getOrderDetails,
  
  // Cuenta
  getAccountBalance,
  getUserInfo,
  
  // Margen
  getMarginInfo,
  
  // Retiro
  getWithdrawHistory,
  
  // Depósito
  getDepositAddress,
  getDepositHistory,
  internalTransfer,
  requestDeposit
};


