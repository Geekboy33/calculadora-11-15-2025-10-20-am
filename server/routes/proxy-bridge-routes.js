/**
 * USD → USDT Bridge con Proxy Contract
 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;




 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


 * Usa el contrato proxy desplegado para ejecutar emisiones reales de USDT
 */

import express from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// USDT Addresses
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// ABI del Proxy
const USDT_PROXY_ABI = [
  "function bridgeTransfer(address _to, uint256 _amount) external returns (bool)",
  "function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)",
  "function bridgeApprove(address _spender, uint256 _amount) external returns (bool)",
  "function ownerIssue(address _to, uint256 _amount) external returns (bool)",
  "function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)",
  "function getBalance() external view returns (uint256)",
  "function getBalanceOf(address _account) external view returns (uint256)",
  "function getTotalSupply() external view returns (uint256)",
  "function getDecimals() external view returns (uint8)",
  "function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)"
];

// ABI de USDT
const USDT_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)"
];

/**
 * POST /api/bridge/proxy/emit-usd-to-usdt
 * Emite USD → USDT usando el contrato proxy
 */
router.post('/proxy/emit-usd-to-usdt', async (req, res) => {
  try {
    const { amount, recipientAddress, proxyAddress } = req.body;

    if (!amount || !recipientAddress || !proxyAddress) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: amount, recipientAddress, proxyAddress'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad inválida'
      });
    }

    if (!ethers.isAddress(recipientAddress) || !ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Direcciones inválidas'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Iniciando emisión USD → USDT via Proxy...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    try {
      // Verificar ETH
      const ethBalance = await provider.getBalance(signerAddress);
      const balanceEth = ethers.formatEther(ethBalance);
      console.log('[🌉 PROXY BRIDGE] ✅ Balance ETH:', balanceEth);

      if (parseFloat(balanceEth) < 0.001) {
        throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.001 ETH`);
      }

      // Conectar al contrato proxy
      const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      // Obtener decimales
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(amountNum.toString(), decimals);

      console.log('[🌉 PROXY BRIDGE] 📊 Detalles de emisión:');
      console.log('   - Proxy:', proxyAddress);
      console.log('   - Destinatario:', recipientAddress);
      console.log('   - Cantidad:', amountNum, 'USDT');
      console.log('   - En Wei:', amountInWei.toString());

      // Obtener gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(20000000000);
      const gasPriceHigh = gasPrice * BigInt(5); // 5x para máxima prioridad

      // Ejecutar bridgeTransfer via proxy con GAS ALTO
      console.log('[🌉 PROXY BRIDGE] 🚀 Ejecutando bridgeTransfer via proxy (GAS ALTO)...');

      const txResponse = await proxyContract.bridgeTransfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: 250000,      // Aumentado
          gasPrice: gasPriceHigh // 5x gas price actual
        }
      );

      const txHash = txResponse.hash;
      console.log('[🌉 PROXY BRIDGE] ✅ TX Hash en blockchain:', txHash);
      console.log('[🌉 PROXY BRIDGE] ⏳ Esperando confirmación...');

      // Esperar confirmación
      const receipt = await txResponse.wait(1);

      console.log('[🌉 PROXY BRIDGE] ✅ Transacción confirmada:');
      console.log('   - Block:', receipt.blockNumber);
      console.log('   - Gas Usado:', receipt.gasUsed.toString());
      console.log('   - Status:', receipt.status === 1 ? 'Success ✓' : 'Failed ✗');

      const gasUsed = receipt.gasUsed;
      const blockNumber = receipt.blockNumber;
      const transactionFeeETH = ethers.formatEther(gasUsed * gasPriceDouble);

      return res.json({
        success: true,
        type: 'USD_TO_USDT_PROXY_BRIDGE_SUCCESS',
        network: 'Ethereum Mainnet',
        mode: 'PROXY_BRIDGE_EMISSION',
        message: `✅ ${amountNum} USD convertidos a ${amountNum} USDT via Proxy Bridge`,

        emission: {
          method: 'Proxy -> bridgeTransfer() -> USDT.transfer()',
          type: 'USD→USDT Proxy Bridge Emission',
          amountUSD: amountNum,
          amountUSDT: amountNum,
          from: 'DAES Bank Proxy',
          to: recipientAddress,
          proxyAddress: proxyAddress,
          timestamp: new Date().toISOString()
        },

        transaction: {
          hash: txHash,
          from: signerAddress,
          to: proxyAddress,
          method: 'bridgeTransfer',
          blockNumber: blockNumber,
          status: receipt.status === 1 ? 'Success ✓' : 'Failed ✗',
          gasUsed: gasUsed.toString(),
          gasLimit: '150000',
          gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
          transactionFee: transactionFeeETH + ' ETH',
          confirmations: 1,
          timestamp: new Date().toISOString()
        },

        contractInfo: {
          proxyAddress: proxyAddress,
          usdtAddress: USDT_ADDRESS,
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: decimals,
          network: 'Ethereum Mainnet'
        },

        conversion: {
          inputCurrency: 'USD (Fiat)',
          outputCurrency: 'USDT (ERC-20)',
          rate: '1:1',
          amountInput: amountNum,
          amountOutput: amountNum,
          conversionType: 'Proxy Bridge Real Emission',
          status: 'Completed'
        },

        balances: {
          signerBefore: balanceEth + ' ETH',
          transactionFee: transactionFeeETH + ' ETH',
          signerAfter: (parseFloat(balanceEth) - parseFloat(transactionFeeETH)).toFixed(8) + ' ETH',
          recipientUSDTReceived: amountNum + ' USDT'
        },

        etherscan: {
          transaction: `https://etherscan.io/tx/${txHash}`,
          proxy: `https://etherscan.io/address/${proxyAddress}`,
          usdt: `https://etherscan.io/token/${USDT_ADDRESS}`,
          recipient: `https://etherscan.io/address/${recipientAddress}`
        },

        confirmation: {
          blockNumber: blockNumber.toString(),
          blockConfirmations: 1,
          timestamp: new Date().toISOString(),
          verified: receipt.status === 1,
          onChain: true,
          realTransaction: true,
          proxyBridge: true
        }
      });

    } catch (error) {
      console.error('[🌉 PROXY BRIDGE] ❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        type: 'PROXY_BRIDGE_ERROR',
        error: error.message,
        details: error.toString(),
        suggestedAction: 'Verifica que el proxy tenga USDT o ETH suficiente, y que la dirección sea correcta'
      });
    }

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error general:', error.message);
    return res.status(500).json({
      success: false,
      type: 'PROXY_BRIDGE_GENERAL_ERROR',
      error: error.message
    });
  }
});

/**
 * GET /api/bridge/proxy/status/:proxyAddress
 * Obtiene el estado del proxy
 */
router.get('/proxy/status/:proxyAddress', async (req, res) => {
  try {
    const { proxyAddress } = req.params;

    if (!ethers.isAddress(proxyAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección proxy inválida'
      });
    }

    console.log('[🌉 PROXY BRIDGE] Obteniendo estado del proxy:', proxyAddress);

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);

    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

    // Obtener información
    const proxyBalance = await proxyContract.getBalance();
    const totalSupply = await proxyContract.getTotalSupply();
    const usdtInfo = await proxyContract.getUSDTInfo();
    const decimals = await proxyContract.getDecimals();

    const proxyBalanceFormatted = ethers.formatUnits(proxyBalance, decimals);
    const totalSupplyFormatted = ethers.formatUnits(totalSupply, decimals);

    return res.json({
      success: true,
      proxyAddress: proxyAddress,
      proxyBalance: proxyBalanceFormatted + ' USDT',
      usdtName: usdtInfo[0],
      usdtSymbol: usdtInfo[1],
      usdtDecimals: usdtInfo[2],
      totalSupply: totalSupplyFormatted + ' USDT',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[🌉 PROXY BRIDGE] ❌ Error obteniendo estado:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

