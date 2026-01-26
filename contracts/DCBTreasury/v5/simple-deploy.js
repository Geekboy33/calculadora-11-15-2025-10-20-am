/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                          DCB TREASURY V5 - SIMPLE DEPLOYMENT                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require('ethers');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    rpc: 'https://rpc.lemonchain.io',
    chainId: 1006,
    explorerApi: 'https://explorer.lemonchain.io/api',
    
    privateKey: '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080',
    adminAddress: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
    
    vusdContract: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
    minterWallet: '0xaccA35529b2FC2041dFb124F83f52120E24377B2',
    
    // Previously deployed contracts for reference (Jan 21)
    existingContracts: {
        PriceOracle: '0xcbe70BB19Df69988f40AB8bc720C3e952bfb5A31',
        USDTokenized: '0x9E11CE52090Ac340a83d1F68De655B8D399eB077',
        LockReserve: '0xF0430F19c37D1E9E5a46713214C5b7c1b351F3fF',
        VUSDMinter: '0x45f445B2264630821d11236e6046bBb5C4c411D3',
        MultichainBridge: '0x3262B92E028711E9Fda94a72d3948B918e6aFD11'
    },
    
    gasPrice: ethers.parseUnits('1', 'gwei'),
    gasLimit: 8000000
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CONSOLE STYLING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const C = {
    reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', red: '\x1b[31m', white: '\x1b[37m'
};

const log = (msg, color = C.white) => console.log(`${color}${msg}${C.reset}`);
const logHeader = (title) => {
    log('\n╔══════════════════════════════════════════════════════════════════════════════════╗', C.cyan);
    log(`║  ${title.padEnd(76)}  ║`, C.cyan);
    log('╚══════════════════════════════════════════════════════════════════════════════════╝', C.cyan);
};
const logSuccess = (msg) => log(`✓ ${msg}`, C.green);
const logInfo = (msg) => log(`ℹ ${msg}`, C.cyan);
const logWarning = (msg) => log(`⚠ ${msg}`, C.yellow);
const logError = (msg) => log(`✗ ${msg}`, C.red);

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// VERIFY CONTRACT USING EXPLORER API
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function verifyContract(contractName, contractAddress, constructorArgs, sourceCode) {
    logInfo(`Verifying ${contractName} at ${contractAddress}...`);
    
    // Encode constructor arguments
    let constructorArgsEncoded = '';
    if (constructorArgs && constructorArgs.length > 0) {
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        
        const typeMap = {
            'PriceOracle': ['address'],
            'USDTokenized': ['address'],
            'LockReserve': ['address', 'address'],
            'VUSDMinter': ['address', 'address', 'address', 'address'],
            'MultichainBridge': ['address', 'address']
        };
        
        const types = typeMap[contractName] || [];
        if (types.length > 0) {
            constructorArgsEncoded = abiCoder.encode(types, constructorArgs).slice(2);
        }
    }
    
    const params = new URLSearchParams({
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contractAddress,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: contractName,
        compilerversion: 'v0.8.24+commit.e11b9ed9',
        optimizationUsed: '1',
        runs: '1',
        evmversion: 'paris',
        constructorArguements: constructorArgsEncoded
    });
    
    return new Promise((resolve) => {
        const postData = params.toString();
        
        const options = {
            hostname: 'explorer.lemonchain.io',
            port: 443,
            path: '/api?module=contract&action=verifysourcecode',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.status === '1' || result.message === 'OK') {
                        logSuccess(`${contractName} verification submitted: ${result.result}`);
                        resolve({ success: true, guid: result.result });
                    } else {
                        logWarning(`${contractName}: ${result.message || result.result}`);
                        resolve({ success: false, result: result.message || result.result });
                    }
                } catch (e) {
                    logWarning(`${contractName} parse error: ${e.message}`);
                    resolve({ success: false, result: e.message });
                }
            });
        });
        
        req.on('error', (e) => {
            logWarning(`${contractName} request error: ${e.message}`);
            resolve({ success: false, result: e.message });
        });
        
        req.write(postData);
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN - VERIFY EXISTING CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

async function main() {
    logHeader('DCB TREASURY V5 - VERIFICATION');
    
    const provider = new ethers.JsonRpcProvider(CONFIG.rpc);
    const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
    
    const balance = await provider.getBalance(wallet.address);
    log(`\n  Wallet: ${wallet.address}`, C.white);
    log(`  Balance: ${ethers.formatEther(balance)} LEMX`, C.white);
    log(`  Chain ID: ${CONFIG.chainId}`, C.white);
    
    // Read flattened contracts from dcb-deploy-temp
    const flatDir = 'C:/Users/USER/Desktop/dcb-deploy-temp/flat-contracts';
    
    const contracts = [
        { 
            name: 'PriceOracle',
            address: CONFIG.existingContracts.PriceOracle,
            args: [CONFIG.adminAddress]
        },
        { 
            name: 'USDTokenized',
            address: CONFIG.existingContracts.USDTokenized,
            args: [CONFIG.adminAddress]
        },
        { 
            name: 'LockReserve',
            address: CONFIG.existingContracts.LockReserve,
            args: [CONFIG.adminAddress, CONFIG.existingContracts.USDTokenized]
        },
        { 
            name: 'VUSDMinter',
            address: CONFIG.existingContracts.VUSDMinter,
            args: [CONFIG.adminAddress, CONFIG.existingContracts.USDTokenized, CONFIG.existingContracts.LockReserve, CONFIG.existingContracts.PriceOracle]
        },
        { 
            name: 'MultichainBridge',
            address: CONFIG.existingContracts.MultichainBridge,
            args: [CONFIG.adminAddress, CONFIG.adminAddress]
        }
    ];
    
    logHeader('VERIFYING DEPLOYED CONTRACTS');
    
    for (const c of contracts) {
        const sourceFile = path.join(flatDir, `${c.name}.sol`);
        
        if (fs.existsSync(sourceFile)) {
            const sourceCode = fs.readFileSync(sourceFile, 'utf8');
            const result = await verifyContract(c.name, c.address, c.args, sourceCode);
            
            if (result.success) {
                logSuccess(`${c.name} submitted for verification`);
            }
        } else {
            logWarning(`Source file not found: ${sourceFile}`);
        }
        
        // Wait between requests
        await new Promise(r => setTimeout(r, 5000));
    }
    
    // Summary
    logHeader('DEPLOYMENT SUMMARY');
    log('\n  ╔══════════════════════════════════════════════════════════════════════════════════╗', C.green);
    log('  ║                           DEPLOYED V5 CONTRACTS                                 ║', C.green);
    log('  ╠══════════════════════════════════════════════════════════════════════════════════╣', C.green);
    
    for (const [name, address] of Object.entries(CONFIG.existingContracts)) {
        log(`  ║  ${name.padEnd(20)} ${address}  ║`, C.white);
    }
    
    log('  ╠══════════════════════════════════════════════════════════════════════════════════╣', C.green);
    log(`  ║  VUSD Contract:      ${CONFIG.vusdContract}  ║`, C.cyan);
    log(`  ║  Minter Wallet:      ${CONFIG.minterWallet}  ║`, C.cyan);
    log(`  ║  Admin:              ${CONFIG.adminAddress}  ║`, C.cyan);
    log('  ╚══════════════════════════════════════════════════════════════════════════════════╝', C.green);
    
    log('\n  Explorer Links:', C.white);
    for (const [name, address] of Object.entries(CONFIG.existingContracts)) {
        log(`  • ${name}: https://explorer.lemonchain.io/address/${address}`, C.cyan);
    }
    
    logSuccess('\nVerification requests submitted!');
    logInfo('Check explorer in a few minutes for verification status.');
}

main().catch(err => {
    logError(err.message);
    process.exit(1);
});
