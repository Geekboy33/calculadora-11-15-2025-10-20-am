/**
 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;





 * 🔄 USDT SWAP ENDPOINT
 * Endpoint para ejecutar swap USD → USDT en Ethereum
 */

import express from 'express';
import USDToUSDTSwap from '../src/lib/usd-usdt-swap-improved.ts';

const router = express.Router();

/**
 * POST /api/swap/usd-to-usdt
 * Ejecutar swap USD → USDT
 */
router.post('/usd-to-usdt', async (req, res) => {
  try {
    const { usdAmount, destinationAddress } = req.body;

    console.log('\n🔄 [SWAP API] Iniciando swap USD → USDT');
    console.log(`   Monto: $${usdAmount}`);
    console.log(`   Destino: ${destinationAddress}`);

    // Validar entrada
    if (!usdAmount || usdAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Monto USD debe ser mayor a 0'
      });
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de destino inválida'
      });
    }

    // Verificar credenciales
    const rpcUrl = process.env.VITE_ETH_RPC_URL;
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY;
    const walletAddress = process.env.VITE_ETH_WALLET_ADDRESS;

    if (!rpcUrl || !privateKey || !walletAddress) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de Ethereum no configuradas'
      });
    }

    // Crear instancia de swap
    const swap = new USDToUSDTSwap({
      rpcUrl,
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey,
      walletAddress,
      gasBuffer: 50,
      maxRetries: 3
    });

    // Ejecutar swap
    const result = await swap.swap(usdAmount, destinationAddress);

    console.log(`\n✅ [SWAP API] Resultado:`);
    console.log(`   Éxito: ${result.success}`);
    console.log(`   Método: ${result.method}`);
    console.log(`   USDT: ${result.amount}`);
    if (result.txHash) {
      console.log(`   TX: ${result.txHash}`);
    }

    return res.json(result);

  } catch (error) {
    console.error('❌ [SWAP API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/swap/rate
 * Obtener tasa actual USD/USDT
 */
router.get('/rate', async (req, res) => {
  try {
    const swap = new USDToUSDTSwap({
      rpcUrl: process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      privateKey: 'demo',
      walletAddress: '0x0000000000000000000000000000000000000000'
    });

    const rate = await swap.getRate();

    return res.json({
      success: true,
      rate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Rate API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;








