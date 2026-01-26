const { ethers } = require('ethers');

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

const CONTRACTS = {
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b'
};

const ADMIN_PRIVATE_KEY = '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';

// Comprehensive ABIs
const USD_ABI = [
  'function totalInjections() view returns (uint256)',
  'function injectionCount() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'event USDInjected(bytes32 indexed injectionId, uint256 amount, address indexed beneficiary, string daesTransactionId, bytes32 dcbSignature)'
];

const LOCK_RESERVE_ABI = [
  'function totalLocks() view returns (uint256)',
  'function lockCount() view returns (uint256)',
  'function name() view returns (string)',
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed injectionId, uint256 amount)',
  'event LockAccepted(bytes32 indexed lockId, uint256 approvedAmount, bytes32 secondSignature)'
];

const VUSD_MINTER_ABI = [
  'function totalMinted() view returns (uint256)',
  'function mintCount() view returns (uint256)',
  'event VUSDMinted(bytes32 indexed lockId, uint256 amount, address indexed beneficiary, bytes32 backedSignature, uint256 timestamp)'
];

const VUSD_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  
  const network = await provider.getNetwork();
  console.log('📡 Network:', network.name, '- Chain ID:', network.chainId.toString());
  console.log('👤 Admin wallet:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'LEMX\n');

  // Connect to contracts
  const usd = new ethers.Contract(CONTRACTS.USD, USD_ABI, provider);
  const lockReserve = new ethers.Contract(CONTRACTS.LockReserve, LOCK_RESERVE_ABI, provider);
  const vusdMinter = new ethers.Contract(CONTRACTS.VUSDMinter, VUSD_MINTER_ABI, provider);
  const vusd = new ethers.Contract(CONTRACTS.VUSD, VUSD_ABI, provider);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 CONTRACT STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // USD Contract
  console.log('\n📜 USD Tokenized Contract:', CONTRACTS.USD);
  try {
    const usdName = await usd.name().catch(() => 'N/A');
    const usdSymbol = await usd.symbol().catch(() => 'N/A');
    const usdSupply = await usd.totalSupply().catch(() => 0n);
    const usdInjections = await usd.totalInjections().catch(() => 
      usd.injectionCount().catch(() => 'N/A')
    );
    console.log('   Name:', usdName);
    console.log('   Symbol:', usdSymbol);
    console.log('   Total Supply:', ethers.formatUnits(usdSupply, 6), 'USD');
    console.log('   Total Injections:', usdInjections.toString());
  } catch (e) {
    console.log('   Error reading USD contract:', e.message);
  }
  
  // LockReserve Contract
  console.log('\n🔒 LockReserve Contract:', CONTRACTS.LockReserve);
  try {
    const lockName = await lockReserve.name().catch(() => 'N/A');
    const totalLocks = await lockReserve.totalLocks().catch(() => 
      lockReserve.lockCount().catch(() => 'N/A')
    );
    console.log('   Name:', lockName);
    console.log('   Total Locks:', totalLocks.toString());
  } catch (e) {
    console.log('   Error reading LockReserve:', e.message);
  }
  
  // VUSDMinter Contract
  console.log('\n🏭 VUSDMinter Contract:', CONTRACTS.VUSDMinter);
  try {
    const totalMinted = await vusdMinter.totalMinted().catch(() => 
      vusdMinter.mintCount().catch(() => 'N/A')
    );
    console.log('   Total Minted:', totalMinted.toString());
  } catch (e) {
    console.log('   Error reading VUSDMinter:', e.message);
  }
  
  // VUSD Token
  console.log('\n💎 VUSD Token:', CONTRACTS.VUSD);
  try {
    const vusdName = await vusd.name();
    const vusdSymbol = await vusd.symbol();
    const vusdDecimals = await vusd.decimals();
    const vusdSupply = await vusd.totalSupply();
    const adminVusdBalance = await vusd.balanceOf(wallet.address);
    console.log('   Name:', vusdName);
    console.log('   Symbol:', vusdSymbol);
    console.log('   Decimals:', vusdDecimals.toString());
    console.log('   Total Supply:', ethers.formatUnits(vusdSupply, vusdDecimals), 'VUSD');
    console.log('   Admin Balance:', ethers.formatUnits(adminVusdBalance, vusdDecimals), 'VUSD');
  } catch (e) {
    console.log('   Error reading VUSD:', e.message);
  }
  
  // Search for events across ALL blocks
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📜 SEARCHING FOR ALL EVENTS (from block 0)');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Search USDInjected events from the beginning
  try {
    const usdEvents = await usd.queryFilter(usd.filters.USDInjected(), 0, currentBlock);
    console.log('\n📦 USDInjected events found:', usdEvents.length);
    
    for (const event of usdEvents) {
      console.log('\n   ─────────────────────────────────────────');
      console.log('   Injection ID:', event.args.injectionId);
      console.log('   Amount:', ethers.formatUnits(event.args.amount, 6), 'USD');
      console.log('   Beneficiary:', event.args.beneficiary);
      console.log('   Block:', event.blockNumber);
      console.log('   TX:', event.transactionHash);
    }
  } catch (e) {
    console.log('   Error querying USD events:', e.message);
  }
  
  // Search LockReceived events
  try {
    const lockEvents = await lockReserve.queryFilter(lockReserve.filters.LockReceived(), 0, currentBlock);
    console.log('\n🔒 LockReceived events found:', lockEvents.length);
    
    for (const event of lockEvents) {
      console.log('\n   ─────────────────────────────────────────');
      console.log('   Lock ID:', event.args.lockId);
      console.log('   Injection ID:', event.args.injectionId);
      console.log('   Amount:', ethers.formatUnits(event.args.amount, 6), 'USD');
      console.log('   Block:', event.blockNumber);
    }
  } catch (e) {
    console.log('   Error querying Lock events:', e.message);
  }
  
  // Search VUSDMinted events
  try {
    const mintEvents = await vusdMinter.queryFilter(vusdMinter.filters.VUSDMinted(), 0, currentBlock);
    console.log('\n💎 VUSDMinted events found:', mintEvents.length);
    
    for (const event of mintEvents) {
      console.log('\n   ─────────────────────────────────────────');
      console.log('   Lock ID:', event.args.lockId);
      console.log('   Amount:', ethers.formatUnits(event.args.amount, 6), 'VUSD');
      console.log('   Beneficiary:', event.args.beneficiary);
      console.log('   Block:', event.blockNumber);
    }
  } catch (e) {
    console.log('   Error querying Mint events:', e.message);
  }
}

main().catch(console.error);
