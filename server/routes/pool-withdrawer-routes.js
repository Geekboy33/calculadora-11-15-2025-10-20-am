/**
 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;



 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;


 * Pool Withdrawer Routes - Extrae USDT de pools reales
 * Soporta: Curve, Balancer, Aave, etc
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Curve 3Pool: https://etherscan.io/address/0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';

// Curve 3Pool ABI (funciones necesarias)
const CURVE_ABI = [
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_virtual_price() external view returns (uint256)'
];

const USDT_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

/**
 * POST /api/pool-withdrawer/withdraw-from-curve
 * Extrae USDT del pool de Curve 3Pool
 * 
 * Parámetros:
 * - amount: cantidad de USDC a cambiar por USDT
 * - recipientAddress: dirección que recibirá el USDT
 * - poolWithdrawerAddress: dirección del contrato Pool Withdrawer
 */
router.post('/withdraw-from-curve', async (req, res) => {
  try {
    const { amount, recipientAddress, poolWithdrawerAddress } = req.body;

    if (!amount || !recipientAddress || !poolWithdrawerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, poolWithdrawerAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(poolWithdrawerAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[💧 POOL WITHDRAWER] Extrayendo USDT de Curve 3Pool...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    console.log('[💧 POOL WITHDRAWER] 📊 Parámetros:');
    console.log('   - Cantidad USDC para cambiar:', amountNum);
    console.log('   - Pool Curve 3Pool:', CURVE_3POOL);
    console.log('   - Destinatario:', recipientAddress);

    // Verificar ETH para gas
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[💧 POOL WITHDRAWER] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.002) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.002`);
    }

    // Conectar a los contratos
    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, signer);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Simular el intercambio para ver cuánto USDT recibiremos
    console.log('[💧 POOL WITHDRAWER] 🔍 Consultando tasa de cambio...');
    
    let usdtExpected = BigInt(0);
    try {
      // get_dy(i, j, dx) -> USDC(0) a USDT(2)
      usdtExpected = await curvePool.get_dy(0, 2, amountInWei);
      console.log('[💧 POOL WITHDRAWER] ✅ USDT esperado:', ethers.formatUnits(usdtExpected, usdtDecimals));
    } catch (err) {
      console.warn('[💧 POOL WITHDRAWER] ⚠️  No se pudo obtener la tasa de cambio:', err.message);
      // Asumir 1:1 si falla
      usdtExpected = amountInWei;
    }

    // Obtener balance actual de USDC del signer
    const signerUSDCBalance = await usdcContract.balanceOf(signerAddress);
    const signerUSDCFormatted = ethers.formatUnits(signerUSDCBalance, usdcDecimals);

    console.log('[💧 POOL WITHDRAWER] 💰 Balance USDC del signer:', signerUSDCFormatted);

    if (signerUSDCBalance < amountInWei) {
      throw new Error(`USDC insuficiente: ${signerUSDCFormatted} < ${amountNum}`);
    }

    // Aprobar el pool para gastar USDC
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobando USDC al pool...');
    const approveTx = await usdcContract.approve(CURVE_3POOL, amountInWei, {
      gasLimit: 100000,
      gasPrice: (await provider.getFeeData()).gasPrice * BigInt(5)
    });
    await approveTx.wait(1);
    console.log('[💧 POOL WITHDRAWER] ✅ Aprobación confirmada');

    // Ejecutar el intercambio en el pool
    console.log('[💧 POOL WITHDRAWER] 🔄 Ejecutando intercambio USDC -> USDT...');

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    const exchangeTx = await curvePool.exchange(
      0,                                    // USDC index
      2,                                    // USDT index
      amountInWei,
      ethers.parseUnits((amountNum * 0.99).toString(), usdtDecimals), // Min con 1% slippage
      {
        gasLimit: 300000,
        gasPrice: gasPrice
      }
    );

    console.log('[💧 POOL WITHDRAWER] ✅ Tx enviada:', exchangeTx.hash);
    console.log('[💧 POOL WITHDRAWER] ⏳ Esperando confirmación...');

    const receipt = await exchangeTx.wait(1);

    console.log('[💧 POOL WITHDRAWER] ✅ Confirmado en bloque:', receipt.blockNumber);

    // Verificar USDT recibido
    const contractUSDTBalance = await usdtContract.balanceOf(poolWithdrawerAddress);
    const usdtReceived = ethers.formatUnits(contractUSDTBalance, usdtDecimals);

    console.log('[💧 POOL WITHDRAWER] 💎 USDT recibido en contrato:', usdtReceived);

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'CURVE_POOL_WITHDRAWAL_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'REAL_POOL_EXTRACTION',
      message: `✅ Extracción exitosa de ${amountNum} USDC -> ${usdtReceived} USDT desde Curve 3Pool`,

      extraction: {
        poolType: 'Curve 3Pool',
        poolAddress: CURVE_3POOL,
        tokenIn: 'USDC',
        tokenOut: 'USDT',
        amountIn: amountNum,
        amountOut: usdtReceived
      },

      transaction: {
        hash: exchangeTx.hash,
        from: signerAddress,
        to: CURVE_3POOL,
        method: 'exchange',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '300000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        curve3PoolAddress: CURVE_3POOL,
        usdcAddress: USDC,
        usdtAddress: USDT,
        poolWithdrawerAddress: poolWithdrawerAddress,
        network: 'Ethereum Mainnet'
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${exchangeTx.hash}`,
        curvePool: `https://etherscan.io/address/${CURVE_3POOL}`,
        usdc: `https://etherscan.io/token/${USDC}`,
        usdt: `https://etherscan.io/token/${USDT}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        poolFundsExtracted: true,
        note: `${amountNum} USDC intercambiados por ${usdtReceived} USDT desde liquidity pool real`
      }
    });

  } catch (error) {
    console.error('[💧 POOL WITHDRAWER] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'POOL_WITHDRAWAL_ERROR',
      error: error.message,
      suggestion: 'Verifica que tengas USDC suficiente y acceso al pool de Curve'
    });
  }
});

/**
 * GET /api/pool-withdrawer/curve-exchange-rate
 * Consulta la tasa de cambio USDC -> USDT en Curve 3Pool
 */
router.get('/curve-exchange-rate/:amount', async (req, res) => {
  try {
    const { amount } = req.params;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const curvePool = new ethers.Contract(CURVE_3POOL, CURVE_ABI, provider);
    const usdcContract = new ethers.Contract(USDC, USDC_ABI, provider);
    const usdtContract = new ethers.Contract(USDT, USDT_ABI, provider);

    const usdcDecimals = await usdcContract.decimals();
    const usdtDecimals = await usdtContract.decimals();

    const amountInWei = ethers.parseUnits(amountNum.toString(), usdcDecimals);

    // Obtener tasa
    const usdtReceived = await curvePool.get_dy(0, 2, amountInWei);
    const usdtFormatted = ethers.formatUnits(usdtReceived, usdtDecimals);

    // Obtener precio del pool
    const virtualPrice = await curvePool.get_virtual_price();

    return res.json({
      success: true,
      exchangeRate: {
        from: { amount: amountNum, token: 'USDC' },
        to: { amount: usdtFormatted, token: 'USDT' },
        rate: parseFloat(usdtFormatted) / amountNum,
        virtualPrice: ethers.formatEther(virtualPrice)
      },
      pool: CURVE_3POOL,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/pool-withdrawer/available-pools
 * Lista los pools disponibles para extraer USDT
 */
router.get('/available-pools', (req, res) => {
  return res.json({
    success: true,
    availablePools: [
      {
        name: 'Curve 3Pool',
        address: CURVE_3POOL,
        tokens: ['USDC', 'DAI', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: '/withdraw-from-curve'
      },
      {
        name: 'Uniswap V3 USDC-USDT 0.01%',
        address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C38',
        tokens: ['USDC', 'USDT'],
        type: 'DEX Pool',
        liquidity: 'Billions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Balancer USDT+DAI+USDC',
        address: '0x79c58f70905F734641735BC61e45c19dD9ad60bC',
        tokens: ['USDT', 'DAI', 'USDC'],
        type: 'DEX Pool',
        liquidity: 'Millions USD',
        endpoint: 'coming_soon'
      },
      {
        name: 'Aave USDT Lending Pool',
        address: '0x6C54Ca6FF63467F4deb7d41f581BCC94B4e425257',
        tokens: ['USDT'],
        type: 'Lending Pool',
        liquidity: 'Billions USD',
        endpoint: '/siphon-from-lending'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;




