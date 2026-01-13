/**
 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';



 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';


 * CONFIGURACIÓN EJEMPLO - USDT MINTER
 * 
 * Este archivo muestra ejemplos de cómo configurar y usar el USDT Minter
 * en diferentes escenarios de desarrollo.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL .ENV
// ============================================================================

/*
# Ethereum Mainnet Configuration
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42b96

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
*/

// ============================================================================
// 2. EJEMPLOS DE LLAMADAS CON CURL
// ============================================================================

/*
# Validar Configuración
curl -X POST http://localhost:3000/api/usdt-minter/validate-setup \
  -H "Content-Type: application/json"

Respuesta esperada:
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}


# Obtener Status del Minter
curl http://localhost:3000/api/usdt-minter/status

Respuesta esperada:
{
  "success": true,
  "status": "active",
  "minterAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5",
  "network": "Ethereum Mainnet",
  "decimals": 6
}


# Emitir 500 USDT
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Bridge testing - Development environment"
  }'

Respuesta esperada:
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x1234567890abcdef...",
  "blockNumber": 19850123,
  "amountIssued": 500,
  "reason": "Bridge testing - Development environment",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42b96",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1500",
  "totalSupplyAfter": "1500",
  "etherscanUrl": "https://etherscan.io/tx/0x1234567890abcdef...",
  "timestamp": "2025-01-03T10:15:30.000Z"
}
*/

// ============================================================================
// 3. EJEMPLOS CON JAVASCRIPT/TYPESCRIPT
// ============================================================================

// Ejemplo: Emitir USDT desde TypeScript
async function issueUSDTTokens(amount: number, reason: string) {
  try {
    const response = await fetch('/api/usdt-minter/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ USDT Emitidos:', data.amountIssued);
      console.log('📊 Balance después:', data.balanceAfter);
      console.log('🔗 Etherscan:', data.etherscanUrl);
      return data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error emitiendo USDT:', error);
    throw error;
  }
}

// Uso:
// issueUSDTTokens(1000, 'Conversion USD to USDT');

// ============================================================================
// 4. INTEGRACIÓN CON BRIDGE USD → USDT
// ============================================================================

// El bridge automáticamente emite USDT cuando se convierte USD
async function convertUSDToUSDT(usdAmount: number, recipientAddress: string) {
  try {
    // 1. Llamar al endpoint de conversión
    const response = await fetch('/api/uniswap/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: usdAmount,
        recipientAddress: recipientAddress,
        slippageTolerance: 1
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Conversión completada');
      console.log(`💵 USD convertidos: ${result.amountUSD}`);
      console.log(`💰 USDT recibidos: ${result.amountUSDT}`);
      console.log(`📊 Comisión: ${result.commission}`);
      console.log(`🔗 TX: ${result.etherscanUrl}`);
      console.log(`🏷️  Precio Oráculo: ${result.oraclePrice}`);
      return result;
    } else {
      console.error('❌ Error en conversión:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error en conversión:', error);
    throw error;
  }
}

// Uso:
// convertUSDToUSDT(100, '0x742d35Cc6634C0532925a3b844Bc9e7595f42b96');

// ============================================================================
// 5. FLUJO COMPLETO: EMITIR Y TRANSFERIR
// ============================================================================

/**
 * Flujo completo:
 * 1. Emitir 1000 USDT
 * 2. Transferir 100 USDT a una dirección
 * 3. Verificar balance
 */
async function completeMinterFlow() {
  console.log('🚀 Iniciando flujo completo de USDT Minter\n');

  // PASO 1: Validar configuración
  console.log('PASO 1: Validando configuración...');
  const validation = await fetch('/api/usdt-minter/validate-setup', {
    method: 'POST'
  }).then(r => r.json());

  if (!validation.success) {
    console.error('❌ Configuración inválida:', validation.error);
    return;
  }
  console.log('✅ Configuración válida');
  console.log(`   Signer: ${validation.configuration.signerAddress}`);
  console.log(`   Balance: ${validation.configuration.signerBalance}\n`);

  // PASO 2: Obtener status actual
  console.log('PASO 2: Obteniendo status del minter...');
  const status1 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance antes: ${status1.minterBalance}`);
  console.log(`   Supply: ${status1.totalSupply}\n`);

  // PASO 3: Emitir USDT
  console.log('PASO 3: Emitiendo 1000 USDT...');
  const issue = await fetch('/api/usdt-minter/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 1000,
      reason: 'Complete flow testing'
    })
  }).then(r => r.json());

  if (!issue.success) {
    console.error('❌ Error:', issue.error);
    return;
  }
  console.log(`✅ Emitidos: ${issue.amountIssued} USDT`);
  console.log(`   TX: ${issue.etherscanUrl}\n`);

  // PASO 4: Verificar nuevo balance
  console.log('PASO 4: Verificando balance después...');
  const status2 = await fetch('/api/usdt-minter/status').then(r => r.json());
  console.log(`✅ Balance después: ${status2.minterBalance}`);
  console.log(`   Supply: ${status2.totalSupply}`);
  console.log(`   Registros: ${status2.totalIssueRecords}\n`);

  console.log('✨ Flujo completado exitosamente');
}

// ============================================================================
// 6. CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO)
// ============================================================================

// Nunca hardcodear secretos. Usar variables de entorno:
const config = {
  // Desarrollo
  development: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY,
    minterAddress: process.env.USDT_MINTER_ADDRESS,
    chainId: 1 // Mainnet
  },

  // Staging
  staging: {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_STAGING,
    minterAddress: process.env.USDT_MINTER_ADDRESS_SEPOLIA,
    chainId: 11155111 // Sepolia
  },

  // Producción
  production: {
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    privateKey: process.env.ETH_PRIVATE_KEY_PROD,
    minterAddress: process.env.USDT_MINTER_ADDRESS_PROD,
    chainId: 1 // Mainnet
  }
};

// ============================================================================
// 7. MANEJO DE ERRORES
// ============================================================================

/*
Errores comunes y soluciones:

❌ "USDT_MINTER_ADDRESS no configurada"
   Solución: Agregar USDT_MINTER_ADDRESS al .env

❌ "Balance ETH insuficiente: 0 ETH < 0.01 ETH"
   Solución: Enviar ETH al signer para pagar gas
   Comando: Enviar 0.1 ETH a la dirección del signer

❌ "Permission Denied: only owner can execute"
   Solución: Signer debe ser el propietario del contrato
   Verificar que PRIVATE_KEY corresponde al propietario

❌ "RPC Error: Invalid API Key"
   Solución: Actualizar ETH_RPC_URL con API key válido

❌ "Contract execution reverted"
   Solución: Verificar que el contrato es válido en Remix IDE

❌ "Exceeds max issue per transaction (1000000)"
   Solución: Reducir cantidad o cambiar límite en el contrato
   Función: setMaxIssuePerTransaction()
*/

// ============================================================================
// 8. MONITOREO Y LOGGING
// ============================================================================

// Logger helper para rastrear emisiones
function logIssueEvent(issueData) {
  const timestamp = new Date().toISOString();
  console.log(`
    [${timestamp}] 📊 USDT Issued
    Amount: ${issueData.amountIssued} USDT
    Reason: ${issueData.reason}
    TX Hash: ${issueData.txHash}
    Block: #${issueData.blockNumber}
    Balance After: ${issueData.balanceAfter} USDT
    Etherscan: ${issueData.etherscanUrl}
  `);

  // En producción, enviar a base de datos o servicio de logging
  // await logToDatabase(issueData);
}

// ============================================================================
// 9. EXPORTAR PARA USAR EN OTROS MÓDULOS
// ============================================================================

export {
  issueUSDTTokens,
  convertUSDToUSDT,
  completeMinterFlow,
  config,
  logIssueEvent
};

// En otros archivos:
// import { issueUSDTTokens, convertUSDToUSDT } from './usdt-minter-examples.js';




