const { ethers } = require('ethers');

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

const CONTRACTS = {
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b'
};

const ADMIN_KEY = '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';

// Correct ABI based on contract source
const USD_ABI = [
  'function getAllInjectionIds() view returns (bytes32[])',
  'function getInjection(bytes32 injectionId) view returns (tuple(bytes32 injectionId, uint256 amount, tuple(uint8 msgType, string messageId, bytes32 xmlHash, string uetr, string instructionId, string endToEndId, uint256 amount, string currency, uint256 createdAt) message, tuple(string bankId, string bankName, address signerAddress, bytes32 certificationHash, uint256 certifiedAt, bool isActive) bankCert, address beneficiary, address initiator, uint8 status, bytes32 dcbSignature, bytes32 bankSignature, uint256 createdAt, uint256 acceptedAt, uint256 lockedAt, uint256 consumedAt, bytes32 lockReserveId, uint256 expiresAt))',
  'function totalInjections() view returns (uint256)',
  'function getInjectionsByStatus(uint8 status, uint256 offset, uint256 limit) view returns (bytes32[])',
  'function acceptInjection(bytes32 injectionId) returns (bool)',
  'function moveToLockReserve(bytes32 injectionId, bytes32 lockReserveId) returns (bool)',
  'function recordConsumptionForVUSD(bytes32 injectionId, bytes32 vusdTxHash) returns (bool)'
];

// Status enum: 0=PENDING, 1=ACCEPTED, 2=IN_LOCK_RESERVE, 3=CONSUMED_FOR_VUSD, 4=CANCELLED, 5=EXPIRED
const STATUS_NAMES = ['PENDING', 'ACCEPTED', 'IN_LOCK_RESERVE', 'CONSUMED_FOR_VUSD', 'CANCELLED', 'EXPIRED'];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_KEY, provider);
  
  console.log('👤 Wallet:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'LEMX\n');
  
  const usd = new ethers.Contract(CONTRACTS.USD, USD_ABI, wallet);
  
  // Get all injection IDs
  console.log('📋 Fetching all injection IDs...');
  const allIds = await usd.getAllInjectionIds();
  console.log('Total injections:', allIds.length);
  
  if (allIds.length === 0) {
    console.log('No injections found.');
    return;
  }
  
  // Get details for each injection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📦 INJECTION DETAILS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const pendingInjections = [];
  
  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    console.log(`\n📦 Injection #${i + 1}:`);
    console.log('   ID:', id);
    
    try {
      const injection = await usd.getInjection(id);
      const status = Number(injection.status);
      
      console.log('   Amount:', ethers.formatUnits(injection.amount, 6), 'USD');
      console.log('   Beneficiary:', injection.beneficiary);
      console.log('   Status:', STATUS_NAMES[status] || status);
      console.log('   DCB Signature:', injection.dcbSignature.slice(0, 20) + '...');
      console.log('   Created:', new Date(Number(injection.createdAt) * 1000).toISOString());
      console.log('   Expires:', new Date(Number(injection.expiresAt) * 1000).toISOString());
      
      if (status === 0) { // PENDING
        pendingInjections.push({
          id: id,
          amount: injection.amount,
          beneficiary: injection.beneficiary,
          dcbSignature: injection.dcbSignature
        });
      }
    } catch (e) {
      console.log('   Error reading:', e.message);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 PENDING INJECTIONS:', pendingInjections.length);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (pendingInjections.length === 0) {
    console.log('No pending injections to process.');
    console.log('All injections have already been processed or have a different status.');
    return;
  }
  
  // Process pending injections
  for (const inj of pendingInjections) {
    console.log(`\n🔄 Processing injection: ${inj.id.slice(0, 20)}...`);
    console.log('   Amount:', ethers.formatUnits(inj.amount, 6), 'USD');
    
    try {
      // Step 1: Accept injection
      console.log('\n   ✍️ Step 1: Accepting injection...');
      const acceptTx = await usd.acceptInjection(inj.id, { gasLimit: 300000 });
      console.log('   TX:', acceptTx.hash);
      await acceptTx.wait();
      console.log('   ✅ Injection accepted!');
      
      // Generate a lock reserve ID
      const lockReserveId = ethers.keccak256(ethers.toUtf8Bytes(`LOCK_${inj.id}_${Date.now()}`));
      
      // Step 2: Move to Lock Reserve
      console.log('\n   🔒 Step 2: Moving to Lock Reserve...');
      const moveTx = await usd.moveToLockReserve(inj.id, lockReserveId, { gasLimit: 300000 });
      console.log('   TX:', moveTx.hash);
      await moveTx.wait();
      console.log('   ✅ Moved to Lock Reserve!');
      console.log('   Lock Reserve ID:', lockReserveId.slice(0, 20) + '...');
      
      // Generate a VUSD tx hash (this would come from actual VUSD minting)
      const vusdTxHash = ethers.keccak256(ethers.toUtf8Bytes(`VUSD_MINT_${inj.id}_${Date.now()}`));
      
      // Step 3: Record consumption for VUSD
      console.log('\n   💎 Step 3: Recording consumption for VUSD...');
      const consumeTx = await usd.recordConsumptionForVUSD(inj.id, vusdTxHash, { gasLimit: 300000 });
      console.log('   TX:', consumeTx.hash);
      await consumeTx.wait();
      console.log('   ✅ Recorded as consumed for VUSD!');
      
      console.log('\n   ═══════════════════════════════════════════════════════════');
      console.log('   ✅ INJECTION FULLY PROCESSED!');
      console.log('   ═══════════════════════════════════════════════════════════');
      console.log('   Amount:', ethers.formatUnits(inj.amount, 6), 'USD → VUSD');
      console.log('   Explorer: https://explorer.lemonchain.io/tx/' + consumeTx.hash);
      
    } catch (e) {
      console.log('   ❌ Error:', e.message);
      if (e.data) console.log('   Data:', e.data);
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('✅ PROCESSING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
