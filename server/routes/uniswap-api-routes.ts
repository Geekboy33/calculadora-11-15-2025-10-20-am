/**
 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;






 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;





 * Uniswap V3 Bridge Backend - Endpoint para ejecutar swaps reales
 * Este archivo se ejecuta en el servidor Node.js
 */

import express, { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Token addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
];

/**
 * POST /api/uniswap/swap
 * Ejecutar swap en Uniswap V3
 */
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, slippageTolerance = 0.5 } = req.body;

    if (!amount || !recipientAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress'
      });
    }

    console.log('[Uniswap Backend] Iniciando swap:', {
      amount,
      recipient: recipientAddress,
      slippage: slippageTolerance
    });

    // Obtener credenciales del ambiente
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh';
    const privateKey = process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    // Inicializar provider y signer
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('[Uniswap Backend] Wallet:', signer.address);

    // Crear instancia del router
    const router_contract = new ethers.Contract(
      UNISWAP_V3_ROUTER,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );

    // Convertir cantidad a wei (USDC tiene 6 decimales)
    const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
    
    // Calcular minimum output con slippage
    const slippage = slippageTolerance || 0.5;
    const amountOutMinimum = amountIn.mul(1000 - Math.floor(slippage * 10)).div(1000);

    // Construir parámetros del swap
    const swapParams = {
      tokenIn: USDC_ADDRESS,
      tokenOut: USDT_ADDRESS,
      fee: 3000, // 0.3% fee
      recipient: recipientAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutos
      amountIn: amountIn,
      amountOutMinimum: amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    console.log('[Uniswap Backend] Parámetros del swap:', {
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      amountOutMinimum: ethers.utils.formatUnits(amountOutMinimum, 6),
      fee: swapParams.fee
    });

    // Estimar gas
    const gasEstimate = await router_contract.estimateGas.exactInputSingle(swapParams);
    console.log('[Uniswap Backend] Gas estimado:', gasEstimate.toString());

    // Ejecutar swap
    const tx = await router_contract.exactInputSingle(swapParams, {
      gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
    });

    console.log('[Uniswap Backend] TX enviada:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[Uniswap Backend] ✅ Swap completado:', {
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return res.json({
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      amountOut: ethers.utils.formatUnits(amountOutMinimum, 6),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en el swap'
    });
  }
});

/**
 * GET /api/uniswap/quote
 * Obtener quote de precio
 */
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro requerido: amount'
      });
    }

    // Aproximación: -1% por fees + slippage
    const amountNum = parseFloat(amount as string);
    const estimatedOut = amountNum * 0.99;

    return res.json({
      success: true,
      amountIn: amountNum,
      amountOut: estimatedOut,
      priceImpact: 0.5,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Uniswap Backend] Error en quote:', error);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo quote'
    });
  }
});

export default router;








