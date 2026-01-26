const { ethers } = require('ethers');

// LemonChain Configuration
const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';
const CHAIN_ID = 1006;

// Contract Addresses (V5)
const CONTRACTS = {
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b'
};

// Admin wallet
const ADMIN_PRIVATE_KEY = '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';
const ADMIN_ADDRESS = '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559';

// ABIs (simplified for the functions we need)
const USD_ABI = [
  'function pendingInjections(uint256) view returns (bytes32 injectionId, uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash, uint256 timestamp, bool processed)',
  'function totalPendingInjections() view returns (uint256)',
  'function getInjection(bytes32 injectionId) view returns (tuple(bytes32 injectionId, uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash, uint256 timestamp, bool processed, bytes32 dcbSignature))',
  'event USDInjected(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary, string daesTransactionId, bytes32 dcbSignature)'
];

const LOCK_RESERVE_ABI = [
  'function receiveLock(bytes32 injectionId, uint256 amount, address beneficiary, bytes32 firstSignature) returns (bytes32 lockId)',
  'function acceptLock(bytes32 lockId, uint256 approvedAmount) returns (bytes32 secondSignature)',
  'function getLock(bytes32 lockId) view returns (tuple(bytes32 lockId, bytes32 injectionId, uint256 amount, uint256 approvedAmount, address beneficiary, bytes32 firstSignature, bytes32 secondSignature, uint256 timestamp, uint8 status))',
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed injectionId, uint256 amount)',
  'event LockAccepted(bytes32 indexed lockId, uint256 approvedAmount, bytes32 secondSignature)'
];

const VUSD_MINTER_ABI = [
  'function mintVUSD(bytes32 lockId, uint256 amount, address beneficiary, bytes32 firstSignature, bytes32 secondSignature) returns (bytes32 backedSignature)',
  'function getMintRequest(bytes32 lockId) view returns (tuple(bytes32 lockId, uint256 amount, address beneficiary, bytes32 firstSignature, bytes32 secondSignature, bytes32 backedSignature, uint256 mintedAt, bool completed))',
  'event VUSDMinted(bytes32 indexed lockId, uint256 amount, address indexed beneficiary, bytes32 backedSignature, uint256 timestamp)'
];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  
  console.log('👤 Admin wallet:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'LEMX');
  
  // Connect to contracts
  const usdContract = new ethers.Contract(CONTRACTS.USD, USD_ABI, wallet);
  const lockReserve = new ethers.Contract(CONTRACTS.LockReserve, LOCK_RESERVE_ABI, wallet);
  const vusdMinter = new ethers.Contract(CONTRACTS.VUSDMinter, VUSD_MINTER_ABI, wallet);
  
  console.log('\n📋 Checking USD contract for pending injections...');
  console.log('   USD Contract:', CONTRACTS.USD);
  
  // Get recent USDInjected events
  const filter = usdContract.filters.USDInjected();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks
  
  console.log(`   Scanning blocks ${fromBlock} to ${currentBlock}...`);
  
  const events = await usdContract.queryFilter(filter, fromBlock, currentBlock);
  console.log(`\n✅ Found ${events.length} USDInjected events:`);
  
  for (const event of events) {
    const { injectionId, amount, beneficiary, daesTransactionId, dcbSignature } = event.args;
    console.log('\n─────────────────────────────────────────');
    console.log('📦 Injection ID:', injectionId);
    console.log('   Amount:', ethers.formatUnits(amount, 6), 'USD');
    console.log('   Beneficiary:', beneficiary);
    console.log('   DAES TX ID:', daesTransactionId);
    console.log('   DCB Signature (1st):', dcbSignature.slice(0, 20) + '...');
    console.log('   Block:', event.blockNumber);
    console.log('   TX Hash:', event.transactionHash);
  }
  
  if (events.length === 0) {
    console.log('No pending injections found.');
    return;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY: Found', events.length, 'injections to process');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
