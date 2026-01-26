const { ethers } = require('ethers');

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

const CONTRACTS = {
  USD: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b'
};

const ADMIN_KEY = '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';

// Full ABIs for the contracts
const USD_ABI = [
  'function getInjection(uint256 index) view returns (bytes32 injectionId, uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash, bytes32 dcbSignature, uint256 timestamp, bool processed)',
  'function injections(uint256) view returns (bytes32 injectionId, uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash, bytes32 dcbSignature, uint256 timestamp, bool processed)',
  'function totalInjections() view returns (uint256)',
  'function injectionById(bytes32) view returns (bytes32 injectionId, uint256 amount, address beneficiary, string daesTransactionId, bytes32 xmlHash, bytes32 dcbSignature, uint256 timestamp, bool processed)'
];

const LOCK_ABI = [
  'function receiveLock(bytes32 injectionId, uint256 amount, address beneficiary, bytes32 firstSignature) external returns (bytes32)',
  'function acceptLock(bytes32 lockId, uint256 approvedAmount) external returns (bytes32)',
  'function totalLocks() view returns (uint256)',
  'event LockReceived(bytes32 indexed lockId, bytes32 indexed injectionId, uint256 amount, address beneficiary)',
  'event LockAccepted(bytes32 indexed lockId, uint256 approvedAmount, bytes32 secondSignature)'
];

const MINTER_ABI = [
  'function mintVUSD(bytes32 lockId, uint256 amount, address beneficiary, bytes32 firstSignature, bytes32 secondSignature) external returns (bytes32)',
  'event VUSDMinted(bytes32 indexed lockId, uint256 amount, address indexed beneficiary, bytes32 backedSignature)'
];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_KEY, provider);
  
  console.log('👤 Wallet:', wallet.address);
  
  const usd = new ethers.Contract(CONTRACTS.USD, USD_ABI, wallet);
  const lockReserve = new ethers.Contract(CONTRACTS.LockReserve, LOCK_ABI, wallet);
  const vusdMinter = new ethers.Contract(CONTRACTS.VUSDMinter, MINTER_ABI, wallet);
  
  // Get total injections
  const totalInjections = await usd.totalInjections();
  console.log('\n📊 Total Injections in USD contract:', totalInjections.toString());
  
  // Try to read each injection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📦 READING INJECTION DETAILS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const pendingInjections = [];
  
  for (let i = 0; i < Number(totalInjections); i++) {
    console.log(`\n📦 Injection #${i}:`);
    try {
      // Try getInjection first
      let injection;
      try {
        injection = await usd.getInjection(i);
      } catch {
        // Try direct array access
        injection = await usd.injections(i);
      }
      
      console.log('   Injection ID:', injection.injectionId || injection[0]);
      console.log('   Amount:', ethers.formatUnits(injection.amount || injection[1], 6), 'USD');
      console.log('   Beneficiary:', injection.beneficiary || injection[2]);
      console.log('   DAES TX ID:', injection.daesTransactionId || injection[3]);
      console.log('   DCB Signature:', (injection.dcbSignature || injection[5])?.slice(0, 20) + '...');
      console.log('   Processed:', injection.processed || injection[7]);
      
      // If not processed, add to pending
      if (!(injection.processed || injection[7])) {
        pendingInjections.push({
          index: i,
          injectionId: injection.injectionId || injection[0],
          amount: injection.amount || injection[1],
          beneficiary: injection.beneficiary || injection[2],
          dcbSignature: injection.dcbSignature || injection[5]
        });
      }
    } catch (e) {
      console.log('   Error reading injection:', e.message);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 PENDING INJECTIONS TO PROCESS:', pendingInjections.length);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (pendingInjections.length === 0) {
    console.log('No pending injections to process.');
    return;
  }
  
  // Process each pending injection
  for (const inj of pendingInjections) {
    console.log(`\n🔄 Processing Injection #${inj.index}...`);
    console.log('   Injection ID:', inj.injectionId);
    console.log('   Amount:', ethers.formatUnits(inj.amount, 6), 'USD');
    
    try {
      // Step 1: Receive Lock in LockReserve
      console.log('\n   📥 Step 1: Receiving Lock in LockReserve...');
      const receiveTx = await lockReserve.receiveLock(
        inj.injectionId,
        inj.amount,
        inj.beneficiary,
        inj.dcbSignature,
        { gasLimit: 500000 }
      );
      console.log('   TX sent:', receiveTx.hash);
      const receiveReceipt = await receiveTx.wait();
      console.log('   ✅ Lock received! Block:', receiveReceipt.blockNumber);
      
      // Get lockId from event
      const lockEvent = receiveReceipt.logs.find(log => {
        try {
          return lockReserve.interface.parseLog(log)?.name === 'LockReceived';
        } catch { return false; }
      });
      const parsedLock = lockReserve.interface.parseLog(lockEvent);
      const lockId = parsedLock.args.lockId;
      console.log('   Lock ID:', lockId);
      
      // Step 2: Accept Lock (generate second signature)
      console.log('\n   ✍️ Step 2: Accepting Lock (Second Signature)...');
      const acceptTx = await lockReserve.acceptLock(
        lockId,
        inj.amount, // Approve full amount
        { gasLimit: 500000 }
      );
      console.log('   TX sent:', acceptTx.hash);
      const acceptReceipt = await acceptTx.wait();
      console.log('   ✅ Lock accepted! Block:', acceptReceipt.blockNumber);
      
      // Get second signature from event
      const acceptEvent = acceptReceipt.logs.find(log => {
        try {
          return lockReserve.interface.parseLog(log)?.name === 'LockAccepted';
        } catch { return false; }
      });
      const parsedAccept = lockReserve.interface.parseLog(acceptEvent);
      const secondSignature = parsedAccept.args.secondSignature;
      console.log('   Second Signature:', secondSignature.slice(0, 20) + '...');
      
      // Step 3: Mint VUSD (third signature)
      console.log('\n   💎 Step 3: Minting VUSD (Third Signature - Backed)...');
      const mintTx = await vusdMinter.mintVUSD(
        lockId,
        inj.amount,
        inj.beneficiary,
        inj.dcbSignature, // First signature
        secondSignature,  // Second signature
        { gasLimit: 500000 }
      );
      console.log('   TX sent:', mintTx.hash);
      const mintReceipt = await mintTx.wait();
      console.log('   ✅ VUSD Minted! Block:', mintReceipt.blockNumber);
      
      // Get backed signature from event
      const mintEvent = mintReceipt.logs.find(log => {
        try {
          return vusdMinter.interface.parseLog(log)?.name === 'VUSDMinted';
        } catch { return false; }
      });
      const parsedMint = vusdMinter.interface.parseLog(mintEvent);
      const backedSignature = parsedMint.args.backedSignature;
      console.log('   Backed Signature (3rd):', backedSignature.slice(0, 20) + '...');
      
      console.log('\n   ═══════════════════════════════════════════════════════════');
      console.log('   ✅ INJECTION FULLY PROCESSED!');
      console.log('   ═══════════════════════════════════════════════════════════');
      console.log('   Amount:', ethers.formatUnits(inj.amount, 6), 'VUSD minted');
      console.log('   Beneficiary:', inj.beneficiary);
      console.log('   Explorer: https://explorer.lemonchain.io/tx/' + mintReceipt.hash);
      
    } catch (e) {
      console.log('   ❌ Error processing:', e.message);
      if (e.data) console.log('   Error data:', e.data);
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('✅ PROCESSING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
