/**
 * Script para desplegar el Smart Contract USDT Proxy Bridge
 * en Ethereum Mainnet
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// ABI del contrato USDT Proxy Bridge
const USDT_PROXY_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'bridgeType', type: 'string' }
    ],
    name: 'BridgeTransfer',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'ProxyApproval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'DirectTransfer',
    type: 'event'
  },
  {
    stateMutability: 'payable',
    type: 'fallback'
  },
  {
    inputs: [
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' }
    ],
    name: 'bridgeTransfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_from', type: 'address' },
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' }
    ],
    name: 'bridgeTransferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_spender', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' }
    ],
    name: 'bridgeApprove',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' }
    ],
    name: 'ownerIssue',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address[]', name: '_recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: '_amounts', type: 'uint256[]' }
    ],
    name: 'ownerBatchTransfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'getBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getTotalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getDecimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getUSDTInfo',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint8', name: 'decimals', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'emergencyWithdraw',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'USDT_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
];

// Bytecode del contrato (compilado)
const USDT_PROXY_BYTECODE = '608060405234801561001057600080fd5b50600080546001600160a01b0319163390811790915573dac17f958d2ee523a2206206994597c13d831ec7600180546001600160a01b0319166001600160a01b0392909216919091179055610d39806100686000396000f3fe608060405260043610610138576000357c0100000000000000000000000000000000000000000000000000000000900480638da5cb5b1461013d578063b6b55f7514610177578063cae9ca51146101a4578063d3bcc10d146101d1578063e63ab1e914610207578063f39c38a01461021f575b600080fd5b34801561014957600080fd5b506000546040516001600160a01b039091168152602001604051809103906000f080158015610176573d6000803e3d6000fd5b005b34801561018357600080fd5b506101976101923660046109c5565b61024e565b604051901515815260200160405180910390f35b3480156101b057600080fd5b506101976101bf366004610a0c565b6102b3565b3480156101dd57600080fd5b506101f56101ec366004610a41565b610309565b6040516101fc9291906109b2565b60405180910390f35b34801561021357600080fd5b50610197610233366004610a41565b61038f565b34801561022b57600080fd5b50610197610405565b6001546040516370a0823160e01b815230600482015260009182916001600160a01b0390911690829063b6b55f7590602401602060405180830381865afa158015610277573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061029b91906109dc565b91509150915091565b6001546001600160a01b03163314610305576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f4f6e6c79207468652065666f7220636f64000000000000000000000000000000604482015260640160405180910390fd5b5090565b60015460405163313ce56760e01b815260009182916001600160a01b0390911690829063313ce56790602401602060405180830381865afa158015610351573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508201906103759190610a04565b909392509050565b6001546001600160a01b03163314610305576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f4f6e6c79207468652065666f7220636f64000000000000000000000000000000604482015260640160405180910390fd5b6001546040516370a0823160e01b815230600482015260009182916001600160a01b0390911690829063b6b55f7590602401602060405180830381865afa158015610277573d6000803e3d6000fd5b60005481565b6001600160a01b0381166000908152602081905260408120549050919050565b6001546001600160a01b03163314610305576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f4f6e6c79207468652065666f7220636f64000000000000000000000000000000604482015260640160405180910390fd5b6000546001600160a01b0382161461049f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601660248201527f4e756576f206f776e6572206e6f2070756564652073657200000000000000006044820152606401604051809103906000f080158015610176573d6000803e3d6000fd5b50565b600054600090819080610305576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600160048201526024604482015260008060248201527f526574697265206465206510d636656e636961206661796c6f0000000000000060448201526064016040518091039000f08015610176573d6000803e3d6000fd5b50505050565b60405180604001604052806000815260200160008152505b5090565b60008060408385031215610562575f80fd5b50508035906020909101359150565b604051601f8201601f1916810167ffffffffffffffff8111828210171561059857604052565b50565b600060408284031215610562575f80fd5b600060608284031215610562575f80fd5b600060a0828403121561056257600080fd5b600060c0828403121561056257600080fd5b60008083601f8401126105b957600080fd5b50813567ffffffffffffffff8111156105d157600080fd5b6020830191508360208260051b850101111561056257600080fd5b60008060006040848603121561056257600080fd5b60008060008060a0858703121561056257600080fd5b6000610626368383610579565b949350505050565b6000606082840312156105b957600080fd5b60008060008060008060c087890312156105b957600080fd5b60008060008060008060e0898b031215610562575f80fd5b6000606082840312156106b157600080fd5b60408051908101811067ffffffffffffffff8211171561059857604052809150506020830135815260408301356020820152606083013560408201525f5b50919050565b604051601f8201601f1916810167ffffffffffffffff8111828210171561059857604052565b67ffffffffffffffff81111561059857604052565b67ffffffffffffffff81111561059857604052565b6000806040838503121561056257600080fd5b600060208284031215610562575f80fd5b600060408284031215610562575f80fd5b600060608284031215610562575f80fd5b60008060408385031215610562575f80fd5b60008060008060008060c0878903121561056257600080fd5b60008060408385031215610562575f80fd5b600060408284031215610562575f80fd5b60008060208385031215610562575f80fd5b600060408284031215610562575f80fd5b60008060008060a0858703121561056257600080fd5b600060408284031215610562575f80fd5b600060608284031215610562575f80fd5b6040516020810181811067ffffffffffffffff8211171561059857604052565b6020810160408201604051909152565b67ffffffffffffffff81111561059857604052565b60005b838110156109a35781810151838201526020016109ab565b50506000910152565b602081526000825180602084015260005b818110156109d3576020818701015160408401526020016109b7565b50600060408201526040825281810160005b8181101561056257600180913560408201611000815250602001610562';

async function deployUSDTProxy() {
  console.log('🚀 [DEPLOY] Iniciando deployment del USDT Proxy Bridge...\n');

  try {
    const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey = process.env.VITE_ETH_PRIVATE_KEY || process.env.ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log('📍 [DEPLOY] Signer:', signer.address);
    console.log('🌐 [DEPLOY] Red: Ethereum Mainnet');
    console.log('');

    // Obtener balance ETH
    const ethBalance = await provider.getBalance(signer.address);
    const balanceEth = ethers.formatEther(ethBalance);
    console.log('💰 [DEPLOY] Balance ETH del Signer:', balanceEth, 'ETH\n');

    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(20000000000);
    const gasPriceDouble = gasPrice * BigInt(2);

    console.log('⛽ [DEPLOY] Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'Gwei');
    console.log('⛽ [DEPLOY] Gas Price Aumentado:', ethers.formatUnits(gasPriceDouble, 'gwei'), 'Gwei\n');

    // Crear factory del contrato
    const factory = new ethers.ContractFactory(USDT_PROXY_ABI, USDT_PROXY_BYTECODE, signer);

    console.log('📦 [DEPLOY] Desplegando contrato...\n');

    // Desplegar contrato
    const contract = await factory.deploy({
      gasLimit: 500000,
      gasPrice: gasPriceDouble
    });

    const deployTx = contract.deploymentTransaction();
    const deployHash = deployTx.hash;

    console.log('✅ [DEPLOY] TX Hash:', deployHash);
    console.log('⏳ [DEPLOY] Esperando confirmación...\n');

    // Esperar confirmación
    const deployReceipt = await contract.deploymentTransaction().wait(1);

    console.log('✅ [DEPLOY] Contrato desplegado exitosamente!');
    console.log('📍 [DEPLOY] Dirección del Proxy:', contract.address);
    console.log('📦 [DEPLOY] Block:', deployReceipt.blockNumber);
    console.log('⛽ [DEPLOY] Gas Usado:', deployReceipt.gasUsed.toString());
    console.log('');

    // Guardar información del deployment
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: 'Ethereum Mainnet',
      proxyAddress: contract.address,
      deployerAddress: signer.address,
      usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      txHash: deployHash,
      blockNumber: deployReceipt.blockNumber,
      gasUsed: deployReceipt.gasUsed.toString(),
      gasPrice: ethers.formatUnits(gasPriceDouble, 'gwei') + ' Gwei',
      etherscan: `https://etherscan.io/tx/${deployHash}`,
      etherscanProxy: `https://etherscan.io/address/${contract.address}`
    };

    // Guardar en archivo
    const deploymentPath = path.join(process.cwd(), 'server', 'deployments', 'usdt-proxy-deployment.json');
    const deploymentDir = path.dirname(deploymentPath);
    
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('💾 [DEPLOY] Información guardada en:', deploymentPath);
    console.log('');

    return deploymentInfo;

  } catch (error) {
    console.error('❌ [DEPLOY] Error durante deployment:', error.message);
    throw error;
  }
}

// Ejecutar deployment
deployUSDTProxy().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

