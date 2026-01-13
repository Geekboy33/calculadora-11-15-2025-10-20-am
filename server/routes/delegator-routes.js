/**
 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


 * USDT Proxy Delegator - Rutas Alternativas
 * NO requiere depositar USDT previamente
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const DELEGATOR_ABI = [
  "function emitIssueEvent(address _to, uint256 _amount) external returns (bytes32)",
  "function registerIssuance(address _to, uint256 _amount) external returns (bool)",
  "function attemptDirectTransfer(address _to, uint256 _amount) external returns (bool)",
  "function getTotalIssued() external view returns (uint256)",
  "function getIssuedAmount(address _to) external view returns (uint256)"
];

const USDT_ABI = [
  "function decimals() public view returns (uint8)"
];

/**
 * POST /api/delegator/emit-issue
 * Emitir USDT sin requerir balance previo
 * Registra el evento en blockchain
 */
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, delegatorAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Direcciones inválidas' });
    }

    console.log('[🔐 DELEGATOR] Emitiendo USDT sin balance previo...');

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const signerAddress = signer.address;

    // Verificar ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DELEGATOR] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} < 0.001`);
    }

    // Conectar al delegador
    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    console.log('[🔐 DELEGATOR] 📊 Parámetros:');
    console.log('   - Delegador:', delegatorAddress);
    console.log('   - Destinatario:', recipientAddress);
    console.log('   - Cantidad:', amountNum, 'USDT');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    // Ejecutar emitIssueEvent - SIN REQUERIR BALANCE
    console.log('[🔐 DELEGATOR] 🚀 Ejecutando emitIssueEvent (NO requiere balance)...');

    const txResponse = await delegatorContract.emitIssueEvent(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 150000,
        gasPrice: gasPrice
      }
    );

    const txHash = txResponse.hash;
    console.log('[🔐 DELEGATOR] ✅ TX Hash:', txHash);
    console.log('[🔐 DELEGATOR] ⏳ Esperando confirmación...');

    const receipt = await txResponse.wait(1);

    console.log('[🔐 DELEGATOR] ✅ Confirmado:');
    console.log('   - Block:', receipt.blockNumber);
    console.log('   - Gas Usado:', receipt.gasUsed.toString());
    console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

    const gasUsed = receipt.gasUsed;
    const transactionFeeETH = ethers.formatEther(gasUsed * gasPrice);

    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_EMIT_SUCCESS',
      network: 'Ethereum Mainnet',
      mode: 'DELEGATOR_EMIT_ISSUE',
      message: `✅ ${amountNum} USDT emitidos (registro en blockchain)`,

      emission: {
        method: 'Delegator.emitIssueEvent() - SIN balance previo',
        type: 'USDT Issuance via Delegator',
        amountUSDT: amountNum,
        to: recipientAddress,
        delegator: delegatorAddress,
        timestamp: new Date().toISOString()
      },

      transaction: {
        hash: txHash,
        from: signerAddress,
        to: delegatorAddress,
        method: 'emitIssueEvent',
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
        gasUsed: gasUsed.toString(),
        gasLimit: '150000',
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' Gwei',
        transactionFee: transactionFeeETH + ' ETH',
        confirmations: 1,
        timestamp: new Date().toISOString()
      },

      contractInfo: {
        delegatorAddress: delegatorAddress,
        usdtAddress: USDT_ADDRESS,
        usdtName: 'Tether USD',
        usdtSymbol: 'USDT',
        decimals: decimals,
        network: 'Ethereum Mainnet'
      },

      alternative: {
        requiresBalance: false,
        registersEvent: true,
        consumesGas: true,
        onBlockchain: true,
        auditable: true
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        delegator: `https://etherscan.io/address/${delegatorAddress}`,
        usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      },

      confirmation: {
        blockNumber: receipt.blockNumber.toString(),
        blockConfirmations: 1,
        timestamp: new Date().toISOString(),
        verified: receipt.status === 1,
        onChain: true,
        realEvent: true,
        note: 'Emisión registrada en blockchain sin requerir USDT previo'
      }
    });

  } catch (error) {
    console.error('[🔐 DELEGATOR] ❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      type: 'DELEGATOR_ERROR',
      error: error.message
    });
  }
});

/**
 * POST /api/delegator/register-issuance
 * Registrar una issuance sin verificación
 */
router.post('/register-issuance', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;

    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros'
      });
    }

    const amountNum = parseFloat(amount);
    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, signer);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const decimals = await usdtContract.decimals();
    const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice * BigInt(5);

    console.log('[🔐 DELEGATOR] Registrando issuance...');

    const txResponse = await delegatorContract.registerIssuance(
      recipientAddress,
      amountInWei,
      {
        gasLimit: 120000,
        gasPrice: gasPrice
      }
    );

    const receipt = await txResponse.wait(1);

    return res.json({
      success: true,
      type: 'ISSUANCE_REGISTERED',
      transaction: {
        hash: txResponse.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗'
      },
      etherscan: {
        transaction: `https://etherscan.io/tx/${txResponse.hash}`
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/delegator/status/:delegatorAddress
 */
router.get('/status/:delegatorAddress', async (req, res) => {
  try {
    const { delegatorAddress } = req.params;

    if (!ethers.isAddress(delegatorAddress)) {
      return res.status(400).json({ success: false, error: 'Dirección inválida' });
    }

    const RPC_URL = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const delegatorContract = new ethers.Contract(delegatorAddress, DELEGATOR_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    const totalIssued = await delegatorContract.getTotalIssued();
    const decimals = await usdtContract.decimals();
    const totalIssuedFormatted = ethers.formatUnits(totalIssued, decimals);

    return res.json({
      success: true,
      delegatorAddress,
      totalIssued: totalIssuedFormatted + ' USDT',
      network: 'Ethereum Mainnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;




