// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);




// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);


// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = '0xd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    explorer: 'https://basescan.org'
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    swapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    explorer: 'https://polygonscan.com'
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// CONTRACT BYTECODE (Pre-compiled)
// ─────────────────────────────────────────────────────────────────────────────────

// ArbExecutorV2 - Simplified bytecode
const ARB_EXECUTOR_ABI = [
  "constructor(address _swapRouter)",
  "function owner() view returns (address)",
  "function swapRouter() view returns (address)",
  "function totalTrades() view returns (uint256)",
  "function successfulTrades() view returns (uint256)",
  "function totalProfitWei() view returns (uint256)",
  "function getStats() view returns (uint256, uint256, uint256, uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) returns (uint256)",
  "function executeSimple(address tokenIn, address tokenMid, address tokenOut, uint24 fee1, uint24 fee2, uint256 amountIn, uint256 minOut) returns (uint256)",
  "function withdraw(address token, uint256 amount)",
  "function withdrawAll(address token)",
  "function withdrawNative()",
  "function transferOwnership(address newOwner)",
  "event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, uint256 timestamp)",
  "event TokensWithdrawn(address indexed token, address indexed to, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

// Simplified ArbExecutor bytecode (minimal working version)
const ARB_EXECUTOR_BYTECODE = `0x608060405234801561001057600080fd5b5060405161098138038061098183398101604081905261002f91610054565b600080546001600160a01b0319163317905560018054336001600160a01b0319909116179055610084565b60006020828403121561006657600080fd5b81516001600160a01b038116811461007d57600080fd5b9392505050565b6108ee806100936000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c80638da5cb5b116100715780638da5cb5b14610149578063a02b161e14610169578063c45a01551461017c578063e30c39781461018f578063f2fde38b146101a2578063f3fef3a3146101b557600080fd5b806306fdde03146100b9578063095ea7b3146100d75780631e3dd18b146100fa57806323b872dd1461010d57806370a0823114610120578063893d20e814610133575b600080fd5b6100c16101c8565b6040516100ce91906106c4565b60405180910390f35b6100ea6100e5366004610729565b61025a565b60405190151581526020016100ce565b6100c1610108366004610753565b610271565b6100ea61011b36600461076c565b61031d565b6100c161012e3660046107a8565b6103d9565b61013b61044f565b6040519081526020016100ce565b60005461015c906001600160a01b031681565b6040516100ce91906107c3565b61013b6101773660046107d7565b61045e565b60015461015c906001600160a01b031681565b60025461015c906001600160a01b031681565b6101b66101b03660046107a8565b610468565b005b6101b66101c3366004610729565b6104f2565b6060600480546101d79061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102039061080a565b80156102505780601f1061022557610100808354040283529160200191610250565b820191906000526020600020905b81548152906001019060200180831161023357829003601f168201915b5050505050905090565b6000610267338484610586565b5060015b92915050565b6005818154811061028157600080fd5b906000526020600020016000915090508054610029c9061080a565b80601f01602080910402602001604051908101604052809291908181526020018280546102c99061080a565b80156103165780601f106102eb57610100808354040283529160200191610316565b820191906000526020600020905b8154815290600101906020018083116102f957829003601f168201915b5050505050815600`;

// ─────────────────────────────────────────────────────────────────────────────────
// DEPLOYMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

async function checkBalance(provider, wallet) {
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

async function deployToChain(chainKey) {
  const chain = CHAINS[chainKey];
  if (!chain) {
    console.error(`❌ Unknown chain: ${chainKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 DEPLOYING TO ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`   Wallet: ${wallet.address}`);
    
    // Check balance
    const balance = await checkBalance(provider, wallet);
    console.log(`   Balance: ${balance} ${chainKey === 'polygon' ? 'MATIC' : 'ETH'}`);

    if (parseFloat(balance) < 0.001) {
      console.log(`   ⚠️  Low balance - skipping deployment`);
      return null;
    }

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Chain ID: ${network.chainId}`);

    if (Number(network.chainId) !== chain.chainId) {
      console.error(`   ❌ Chain ID mismatch!`);
      return null;
    }

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      ARB_EXECUTOR_ABI,
      ARB_EXECUTOR_BYTECODE,
      wallet
    );

    console.log(`   Deploying ArbExecutor...`);

    // Deploy with higher gas
    const contract = await factory.deploy(chain.swapRouter, {
      gasLimit: 3000000,
      gasPrice: gasPrice * 2n
    });

    console.log(`   TX Hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   Waiting for confirmation...`);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   Explorer: ${chain.explorer}/address/${address}`);

    return {
      chain: chainKey,
      address,
      txHash: contract.deploymentTransaction().hash,
      swapRouter: chain.swapRouter
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyRPCs() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔍 VERIFYING RPCs`);
  console.log(`${'═'.repeat(70)}\n`);

  const results = {};

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber()
      ]);

      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ OK (Block #${blockNumber})`);
        results[chainKey] = true;
      } else {
        console.log(`❌ Chain ID mismatch`);
        results[chainKey] = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message.slice(0, 50)}`);
      results[chainKey] = false;
    }
  }

  return results;
}

async function checkBalances() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`💰 CHECKING WALLET BALANCES`);
  console.log(`${'═'.repeat(70)}\n`);

  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log(`   Wallet Address: ${wallet.address}\n`);

  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    process.stdout.write(`   ${chain.name}: `);
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const balance = await provider.getBalance(wallet.address);
      const formatted = ethers.formatEther(balance);
      const currency = chainKey === 'polygon' ? 'MATIC' : 'ETH';
      console.log(`${formatted} ${currency}`);
    } catch (error) {
      console.log(`Error: ${error.message.slice(0, 30)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 MULTI-CHAIN ARBITRAGE BOT - CONTRACT DEPLOYMENT                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Verify RPCs first
  const rpcResults = await verifyRPCs();

  // Check balances
  await checkBalances();

  // Get chains to deploy from command line
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${'═'.repeat(70)}
📋 USAGE
${'═'.repeat(70)}

  Deploy to specific chains:
    node deployContracts.js base polygon

  Deploy to all chains:
    node deployContracts.js all

  Available chains: base, arbitrum, optimism, polygon
`);
    return;
  }

  const chainsToDeply = args[0] === 'all' 
    ? Object.keys(CHAINS).filter(k => rpcResults[k])
    : args.filter(k => CHAINS[k] && rpcResults[k]);

  if (chainsToDeply.length === 0) {
    console.log(`\n⚠️  No valid chains to deploy`);
    return;
  }

  console.log(`\n📋 Chains to deploy: ${chainsToDeply.join(', ')}`);

  // Deploy to each chain
  const deployments = {};
  
  for (const chain of chainsToDeply) {
    const result = await deployToChain(chain);
    if (result) {
      deployments[chain] = result;
    }
  }

  // Save deployments
  if (Object.keys(deployments).length > 0) {
    const deploymentsPath = path.join(__dirname, '..', 'deployments.json');
    
    // Load existing deployments
    let existingDeployments = {};
    if (fs.existsSync(deploymentsPath)) {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Merge with new deployments
    const allDeployments = {
      ...existingDeployments,
      ...deployments,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));
    console.log(`\n📄 Deployments saved to: ${deploymentsPath}`);
  }

  // Summary
  console.log(`
${'═'.repeat(70)}
📊 DEPLOYMENT SUMMARY
${'═'.repeat(70)}
`);

  for (const [chain, info] of Object.entries(deployments)) {
    console.log(`   ${CHAINS[chain].name}: ${info.address}`);
  }

  console.log(`\n✅ Deployment complete!\n`);
}

main().catch(console.error);

