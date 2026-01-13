/**
 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;



 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;


 * USDT Minter Backend - Rutas para emisión de tokens
 * 
 * Integración con el bridge USD → USDT
 * Permite emitir más USDT a través de un contrato intermediario
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Configuración
const USDT_MINTER_ADDRESS = process.env.USDT_MINTER_ADDRESS || '0x...';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY || '';

// ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "issueUSDT",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDecimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getIssueRecordsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ABI de USDT (ERC-20)
const USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "who", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * POST /api/usdt-minter/issue
 * Emitir más tokens USDT usando el contrato intermediario
 * 
 * Request body:
 * {
 *   "amount": 1000,  // Cantidad en USDT (sin decimales)
 *   "reason": "Bridge testing"
 * }
 */
router.post('/issue', async (req, res) => {
  try {
    const { amount, reason = 'Token issuance request' } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida o no proporcionada'
      });
    }

    console.log('[USDT MINTER] 📋 Solicitud de emisión:', { amount, reason });

    // Conectar a provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Conectar a contrato USDT Minter
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener decimales y balance actual
    const decimals = await usdtContract.decimals();
    const currentBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const totalSupply = await usdtContract.totalSupply();

    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    console.log('[USDT MINTER] ✅ Balance actual:', {
      minterBalance: ethers.formatUnits(currentBalance, decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      amountToIssue: amount
    });

    // Ejecutar emisión
    console.log('[USDT MINTER] ⚡ Ejecutando issueUSDT()...');
    const tx = await minterContract.issueUSDT(amountInWei, reason, {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits('25', 'gwei')
    });

    console.log('[USDT MINTER] 📤 TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    // Obtener nuevo balance
    const newBalance = await usdtContract.balanceOf(USDT_MINTER_ADDRESS);
    const newTotalSupply = await usdtContract.totalSupply();

    console.log('[USDT MINTER] ✅ Emisión completada:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      newBalance: ethers.formatUnits(newBalance, decimals),
      newTotalSupply: ethers.formatUnits(newTotalSupply, decimals)
    });

    return res.json({
      success: true,
      type: 'USDT_MINTER_ISSUE_SUCCESS',
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amountIssued: amount,
      reason: reason,
      network: 'Ethereum Mainnet',
      contractAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      balanceAfter: ethers.formatUnits(newBalance, decimals),
      totalSupplyAfter: ethers.formatUnits(newTotalSupply, decimals),
      etherscanUrl: `https://etherscan.io/tx/${receipt.hash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error en emisión:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error emitiendo USDT: ' + error.message,
      details: error.toString()
    });
  }
});

/**
 * GET /api/usdt-minter/status
 * Obtener estado del contrato Minter
 */
router.get('/status', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const minterContract = new ethers.Contract(USDT_MINTER_ADDRESS, USDT_MINTER_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const minterBalance = await minterContract.getBalance();
    const decimals = await usdtContract.decimals();
    const totalSupply = await usdtContract.totalSupply();
    const recordCount = await minterContract.getIssueRecordsCount();

    return res.json({
      success: true,
      status: 'active',
      minterAddress: USDT_MINTER_ADDRESS,
      usdtAddress: USDT_ADDRESS,
      minterBalance: ethers.formatUnits(minterBalance, decimals) + ' USDT',
      totalSupply: ethers.formatUnits(totalSupply, decimals) + ' USDT',
      totalIssueRecords: recordCount.toString(),
      network: 'Ethereum Mainnet',
      decimals: decimals
    });

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error obteniendo status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo status del minter'
    });
  }
});

/**
 * POST /api/usdt-minter/validate-setup
 * Validar que el sistema está configurado correctamente
 */
router.post('/validate-setup', async (req, res) => {
  try {
    console.log('[USDT MINTER] 🔍 Validando configuración...');

    if (!PRIVATE_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ETH_PRIVATE_KEY no configurada en .env'
      });
    }

    if (USDT_MINTER_ADDRESS === '0x...') {
      return res.status(400).json({
        success: false,
        error: 'USDT_MINTER_ADDRESS no configurada en .env'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const ethBalance = await provider.getBalance(signer.address);

    const validation = {
      success: true,
      configuration: {
        rpcUrl: RPC_URL.substring(0, 50) + '...',
        signerAddress: signer.address,
        signerBalance: ethers.formatEther(ethBalance) + ' ETH',
        minterAddress: USDT_MINTER_ADDRESS,
        usdtAddress: USDT_ADDRESS,
        hasPrivateKey: !!PRIVATE_KEY
      }
    };

    if (parseFloat(ethers.formatEther(ethBalance)) < 0.01) {
      validation.warning = 'Balance ETH bajo para transacciones (< 0.01 ETH)';
    }

    return res.json(validation);

  } catch (error) {
    console.error('[USDT MINTER] ❌ Error validando:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error validando configuración: ' + error.message
    });
  }
});

export default router;




