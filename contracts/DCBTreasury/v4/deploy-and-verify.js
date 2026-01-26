/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║  DCB TREASURY SMART CONTRACTS v4.0.0 - DEPLOYMENT & VERIFICATION SCRIPT                                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  This script deploys all contracts to LemonChain and verifies them on the explorer                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const https = require('https');
const solc = require('solc');

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Network
    RPC_URL: 'https://rpc.lemonchain.io',
    CHAIN_ID: 8866,
    EXPLORER_URL: 'https://explorer.lemonchain.io',
    EXPLORER_API: 'https://explorer.lemonchain.io/api',
    
    // Compiler Settings
    SOLIDITY_VERSION: '0.8.24',
    OPTIMIZER_ENABLED: true,
    OPTIMIZER_RUNS: 200,
    EVM_VERSION: 'paris',
    VIA_IR: true,
    
    // Admin wallet (use environment variable or replace with your admin address)
    ADMIN_ADDRESS: process.env.ADMIN_ADDRESS || '0xYourAdminAddressHere',
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    
    // Fee collector for bridge
    FEE_COLLECTOR: process.env.FEE_COLLECTOR || '0xYourFeeCollectorHere',
    
    // Contracts to deploy
    CONTRACTS: [
        'PriceOracle',
        'USD',
        'LockReserve',
        'LUSDMinter',
        'MultichainBridge'
    ]
};

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN IMAGE (SVG for USD Token)
// ══════════════════════════════════════════════════════════════════════════════

const USD_TOKEN_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a"/>
      <stop offset="50%" style="stop-color:#1a1a1a"/>
      <stop offset="100%" style="stop-color:#0a0a0a"/>
    </linearGradient>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00ff88"/>
      <stop offset="50%" style="stop-color:#00cc66"/>
      <stop offset="100%" style="stop-color:#009944"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#00ff88" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <circle cx="200" cy="200" r="195" fill="url(#bgGrad)" stroke="url(#greenGrad)" stroke-width="4"/>
  
  <!-- Inner ring -->
  <circle cx="200" cy="200" r="170" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.3"/>
  
  <!-- Outer decorative ring -->
  <circle cx="200" cy="200" r="180" fill="none" stroke="#00ff88" stroke-width="1" stroke-dasharray="10,5" opacity="0.5"/>
  
  <!-- USD Symbol with glow -->
  <g filter="url(#glow)">
    <text x="200" y="230" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="140" font-weight="900" fill="url(#greenGrad)">$</text>
  </g>
  
  <!-- USD text -->
  <text x="200" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#00ff88" letter-spacing="8">USD</text>
  
  <!-- Top label -->
  <text x="200" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#00cc66" opacity="0.8">TOKENIZED</text>
  
  <!-- Bottom label -->
  <text x="200" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#00cc66" opacity="0.6">DCB TREASURY</text>
  
  <!-- Decorative dots -->
  <circle cx="100" cy="200" r="4" fill="#00ff88" opacity="0.6"/>
  <circle cx="300" cy="200" r="4" fill="#00ff88" opacity="0.6"/>
  <circle cx="200" cy="100" r="4" fill="#00ff88" opacity="0.6"/>
  
  <!-- Corner accents -->
  <path d="M 50 120 L 50 80 L 90 80" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.4"/>
  <path d="M 350 120 L 350 80 L 310 80" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.4"/>
  <path d="M 50 280 L 50 320 L 90 320" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.4"/>
  <path d="M 350 280 L 350 320 L 310 320" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.4"/>
</svg>`;

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function getContractSources() {
    const contractsDir = path.join(__dirname, 'contracts');
    const sources = {};
    
    // Read all contract files
    const contractFiles = [
        'PriceOracle.sol',
        'USD.sol',
        'LockReserve.sol',
        'LUSDMinter.sol',
        'MultichainBridge.sol',
        'interfaces/ILUSD.sol'
    ];
    
    for (const file of contractFiles) {
        const filePath = path.join(contractsDir, file);
        if (fs.existsSync(filePath)) {
            sources[file] = { content: fs.readFileSync(filePath, 'utf8') };
        }
    }
    
    // Add OpenZeppelin imports
    const ozPath = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@openzeppelin', 'contracts');
    const ozFiles = [
        'access/AccessControl.sol',
        'access/IAccessControl.sol',
        'utils/Pausable.sol',
        'utils/ReentrancyGuard.sol',
        'utils/Context.sol',
        'utils/introspection/ERC165.sol',
        'utils/introspection/IERC165.sol',
        'token/ERC20/ERC20.sol',
        'token/ERC20/IERC20.sol',
        'token/ERC20/extensions/IERC20Metadata.sol',
        'token/ERC20/extensions/IERC20Permit.sol',
        'token/ERC20/extensions/ERC20Burnable.sol',
        'token/ERC20/extensions/ERC20Permit.sol',
        'token/ERC20/utils/SafeERC20.sol',
        'utils/cryptography/ECDSA.sol',
        'utils/cryptography/MessageHashUtils.sol',
        'utils/cryptography/EIP712.sol',
        'utils/Nonces.sol',
        'utils/ShortStrings.sol',
        'utils/StorageSlot.sol',
        'utils/Strings.sol',
        'utils/math/Math.sol',
        'utils/math/SignedMath.sol',
        'interfaces/IERC5267.sol',
        'interfaces/draft-IERC6093.sol'
    ];
    
    for (const file of ozFiles) {
        const filePath = path.join(ozPath, file);
        if (fs.existsSync(filePath)) {
            sources[`@openzeppelin/contracts/${file}`] = { content: fs.readFileSync(filePath, 'utf8') };
        }
    }
    
    return sources;
}

function compileContracts() {
    console.log('📦 Compiling contracts...');
    
    const sources = getContractSources();
    
    const input = {
        language: 'Solidity',
        sources: sources,
        settings: {
            optimizer: {
                enabled: CONFIG.OPTIMIZER_ENABLED,
                runs: CONFIG.OPTIMIZER_RUNS
            },
            viaIR: CONFIG.VIA_IR,
            evmVersion: CONFIG.EVM_VERSION,
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata']
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('❌ Compilation errors:');
            errors.forEach(e => console.error(e.formattedMessage));
            throw new Error('Compilation failed');
        }
    }
    
    console.log('✅ Compilation successful');
    return { output, standardJsonInput: input };
}

async function httpsRequest(url, options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function verifyContract(address, contractName, constructorArgs, standardJsonInput) {
    console.log(`🔍 Verifying ${contractName} at ${address}...`);
    
    const params = new URLSearchParams();
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', address);
    params.append('sourceCode', JSON.stringify(standardJsonInput));
    params.append('codeformat', 'solidity-standard-json-input');
    params.append('contractname', `contracts/${contractName}.sol:${contractName}`);
    params.append('compilerversion', `v${CONFIG.SOLIDITY_VERSION}+commit.e11b9ed9`);
    params.append('constructorArguements', constructorArgs);
    params.append('evmversion', CONFIG.EVM_VERSION);
    params.append('optimizationUsed', CONFIG.OPTIMIZER_ENABLED ? '1' : '0');
    params.append('runs', CONFIG.OPTIMIZER_RUNS.toString());
    
    const body = params.toString();
    
    try {
        const response = await httpsRequest(
            `${CONFIG.EXPLORER_API}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            body
        );
        
        if (response.data.status === '1' || response.data.result) {
            console.log(`✅ ${contractName} verification submitted`);
            return response.data.result;
        } else {
            console.log(`⚠️ ${contractName} verification response:`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error verifying ${contractName}:`, error.message);
        return null;
    }
}

async function deployContract(provider, wallet, bytecode, abi, constructorArgs, contractName) {
    console.log(`🚀 Deploying ${contractName}...`);
    
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log(`✅ ${contractName} deployed at: ${address}`);
    
    return { contract, address };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DEPLOYMENT FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═'.repeat(80));
    console.log('  DCB TREASURY SMART CONTRACTS v4.0.0 - DEPLOYMENT');
    console.log('═'.repeat(80));
    console.log(`  Network: LemonChain (${CONFIG.CHAIN_ID})`);
    console.log(`  RPC: ${CONFIG.RPC_URL}`);
    console.log(`  Admin: ${CONFIG.ADMIN_ADDRESS}`);
    console.log('═'.repeat(80));
    
    // Check if private key is set
    if (!CONFIG.PRIVATE_KEY) {
        console.log('\n⚠️  No private key provided.');
        console.log('   Set PRIVATE_KEY environment variable to deploy.');
        console.log('   Or manually deploy using the compiled contracts.\n');
        
        // Still compile and save artifacts
        const { output, standardJsonInput } = compileContracts();
        
        // Save standard JSON input for manual verification
        fs.writeFileSync(
            path.join(__dirname, 'standard-json-input.json'),
            JSON.stringify(standardJsonInput, null, 2)
        );
        console.log('📄 Saved standard-json-input.json for manual verification');
        
        // Save token image
        fs.writeFileSync(
            path.join(__dirname, 'USD-Token-Logo.svg'),
            USD_TOKEN_IMAGE
        );
        console.log('🖼️  Saved USD-Token-Logo.svg');
        
        return;
    }
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`\n💰 Wallet balance: ${ethers.formatEther(balance)} LEMON`);
    
    if (balance < ethers.parseEther('0.1')) {
        console.error('❌ Insufficient balance for deployment');
        return;
    }
    
    // Compile
    const { output, standardJsonInput } = compileContracts();
    
    const deployedContracts = {};
    
    try {
        // 1. Deploy PriceOracle
        const priceOracleOutput = output.contracts['PriceOracle.sol']['PriceOracle'];
        const { address: priceOracleAddress } = await deployContract(
            provider, wallet,
            '0x' + priceOracleOutput.evm.bytecode.object,
            priceOracleOutput.abi,
            [CONFIG.ADMIN_ADDRESS],
            'PriceOracle'
        );
        deployedContracts.PriceOracle = priceOracleAddress;
        
        // 2. Deploy USD
        const usdOutput = output.contracts['USD.sol']['USD'];
        const { address: usdAddress } = await deployContract(
            provider, wallet,
            '0x' + usdOutput.evm.bytecode.object,
            usdOutput.abi,
            [CONFIG.ADMIN_ADDRESS],
            'USD'
        );
        deployedContracts.USD = usdAddress;
        
        // 3. Deploy LockReserve
        const lockReserveOutput = output.contracts['LockReserve.sol']['LockReserve'];
        const { address: lockReserveAddress } = await deployContract(
            provider, wallet,
            '0x' + lockReserveOutput.evm.bytecode.object,
            lockReserveOutput.abi,
            [CONFIG.ADMIN_ADDRESS, usdAddress],
            'LockReserve'
        );
        deployedContracts.LockReserve = lockReserveAddress;
        
        // 4. Deploy LUSDMinter
        const lusdMinterOutput = output.contracts['LUSDMinter.sol']['LUSDMinter'];
        const { address: lusdMinterAddress } = await deployContract(
            provider, wallet,
            '0x' + lusdMinterOutput.evm.bytecode.object,
            lusdMinterOutput.abi,
            [CONFIG.ADMIN_ADDRESS, usdAddress, lockReserveAddress, priceOracleAddress],
            'LUSDMinter'
        );
        deployedContracts.LUSDMinter = lusdMinterAddress;
        
        // 5. Deploy MultichainBridge
        const bridgeOutput = output.contracts['MultichainBridge.sol']['MultichainBridge'];
        const { address: bridgeAddress } = await deployContract(
            provider, wallet,
            '0x' + bridgeOutput.evm.bytecode.object,
            bridgeOutput.abi,
            [CONFIG.ADMIN_ADDRESS, usdAddress, CONFIG.FEE_COLLECTOR],
            'MultichainBridge'
        );
        deployedContracts.MultichainBridge = bridgeAddress;
        
        console.log('\n' + '═'.repeat(80));
        console.log('  DEPLOYED CONTRACTS');
        console.log('═'.repeat(80));
        for (const [name, address] of Object.entries(deployedContracts)) {
            console.log(`  ${name}: ${address}`);
        }
        console.log('═'.repeat(80));
        
        // Save deployment info
        const deploymentInfo = {
            network: 'LemonChain',
            chainId: CONFIG.CHAIN_ID,
            deployedAt: new Date().toISOString(),
            admin: CONFIG.ADMIN_ADDRESS,
            contracts: deployedContracts,
            compiler: {
                version: CONFIG.SOLIDITY_VERSION,
                optimizer: CONFIG.OPTIMIZER_ENABLED,
                runs: CONFIG.OPTIMIZER_RUNS,
                evmVersion: CONFIG.EVM_VERSION,
                viaIR: CONFIG.VIA_IR
            }
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'deployment-info.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        // Verify contracts
        console.log('\n🔍 Starting verification...\n');
        
        // Encode constructor args
        const abiCoder = new ethers.AbiCoder();
        
        await verifyContract(
            priceOracleAddress,
            'PriceOracle',
            abiCoder.encode(['address'], [CONFIG.ADMIN_ADDRESS]).slice(2),
            standardJsonInput
        );
        
        await verifyContract(
            usdAddress,
            'USD',
            abiCoder.encode(['address'], [CONFIG.ADMIN_ADDRESS]).slice(2),
            standardJsonInput
        );
        
        await verifyContract(
            lockReserveAddress,
            'LockReserve',
            abiCoder.encode(['address', 'address'], [CONFIG.ADMIN_ADDRESS, usdAddress]).slice(2),
            standardJsonInput
        );
        
        await verifyContract(
            lusdMinterAddress,
            'LUSDMinter',
            abiCoder.encode(
                ['address', 'address', 'address', 'address'],
                [CONFIG.ADMIN_ADDRESS, usdAddress, lockReserveAddress, priceOracleAddress]
            ).slice(2),
            standardJsonInput
        );
        
        await verifyContract(
            bridgeAddress,
            'MultichainBridge',
            abiCoder.encode(
                ['address', 'address', 'address'],
                [CONFIG.ADMIN_ADDRESS, usdAddress, CONFIG.FEE_COLLECTOR]
            ).slice(2),
            standardJsonInput
        );
        
        // Save token image
        fs.writeFileSync(
            path.join(__dirname, 'USD-Token-Logo.svg'),
            USD_TOKEN_IMAGE
        );
        console.log('\n🖼️  Saved USD-Token-Logo.svg');
        
        // Create token info for submission
        const tokenInfo = {
            name: 'USD Tokenized',
            symbol: 'USD',
            address: usdAddress,
            decimals: 6,
            chainId: CONFIG.CHAIN_ID,
            logoURI: `https://explorer.lemonchain.io/token/${usdAddress}/logo.svg`,
            description: 'Tokenized US Dollar by Digital Commercial Bank Treasury',
            website: 'https://digitalcommercialbank.com',
            documentation: 'https://docs.digitalcommercialbank.com/usd',
            links: {
                explorer: `${CONFIG.EXPLORER_URL}/token/${usdAddress}`,
                github: 'https://github.com/dcb-treasury'
            }
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'token-info.json'),
            JSON.stringify(tokenInfo, null, 2)
        );
        console.log('📄 Saved token-info.json');
        
        console.log('\n' + '═'.repeat(80));
        console.log('  DEPLOYMENT COMPLETE');
        console.log('═'.repeat(80));
        console.log('\n  Next steps:');
        console.log('  1. Configure contract relationships:');
        console.log(`     - USD.setLockReserveContract(${lockReserveAddress})`);
        console.log(`     - USD.setTreasuryMintingContract(${lusdMinterAddress})`);
        console.log(`     - LockReserve.setLUSDMintingContract(${lusdMinterAddress})`);
        console.log('  2. Grant MINTER_ROLE to LUSDMinter on LUSD contract');
        console.log('  3. Submit token icon to LemonChain explorer');
        console.log('  4. Configure bridge contracts on other chains\n');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error);
        throw error;
    }
}

// Run
main().catch(console.error);
