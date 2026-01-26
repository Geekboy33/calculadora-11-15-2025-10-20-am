const { ethers } = require('ethers');

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';
const VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';

// VUSD Minter wallet with MINTER_ROLE
const MINTER_WALLET = '0xaccA35529b2FC2041dFb124F83f52120E24377B2';
const MINTER_KEY = '72476caaa12e83677bc5c704dd8dd19f6220139909f4cbff9c8ca47543b4dedd';

// Beneficiaries from the 3 injections
const BENEFICIARIES = [
  { address: '0x3AE56254b3ca9f953a78Cd91D794a99549EA398f', amount: '963' },
  { address: '0xFDb5d5a9045Aa1d843555a5019182A502E8ee904', amount: '963' },
  { address: '0x27C9Ded5A8C3F78dA824e0e475e00A6419842d04', amount: '1000' }
];

const VUSD_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)'
];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const minterWallet = new ethers.Wallet(MINTER_KEY, provider);
  
  console.log('👤 Minter Wallet:', minterWallet.address);
  
  const balance = await provider.getBalance(minterWallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'LEMX');
  
  if (balance === 0n) {
    console.log('❌ ERROR: Minter wallet has no LEMX for gas!');
    console.log('   Please send some LEMX to:', minterWallet.address);
    return;
  }
  
  const vusd = new ethers.Contract(VUSD_CONTRACT, VUSD_ABI, minterWallet);
  
  // Verify minter role
  console.log('\n📋 Checking VUSD contract...');
  const name = await vusd.name();
  const symbol = await vusd.symbol();
  const decimals = await vusd.decimals();
  const totalSupply = await vusd.totalSupply();
  
  console.log('   Name:', name);
  console.log('   Symbol:', symbol);
  console.log('   Decimals:', decimals.toString());
  console.log('   Total Supply:', ethers.formatUnits(totalSupply, decimals), 'VUSD');
  
  // Check minter role
  const minterRole = await vusd.MINTER_ROLE();
  const hasMinterRole = await vusd.hasRole(minterRole, minterWallet.address);
  console.log('\n🔑 Has MINTER_ROLE:', hasMinterRole);
  
  if (!hasMinterRole) {
    console.log('❌ ERROR: Wallet does not have MINTER_ROLE!');
    return;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💎 MINTING VUSD TO BENEFICIARIES');
  console.log('═══════════════════════════════════════════════════════════════');
  
  for (const beneficiary of BENEFICIARIES) {
    console.log(`\n📤 Minting ${beneficiary.amount} VUSD to ${beneficiary.address}...`);
    
    try {
      // VUSD has 18 decimals
      const amountWei = ethers.parseUnits(beneficiary.amount, 18);
      
      const tx = await vusd.mint(beneficiary.address, amountWei, { gasLimit: 200000 });
      console.log('   TX:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('   ✅ Minted! Block:', receipt.blockNumber);
      console.log('   Explorer: https://explorer.lemonchain.io/tx/' + receipt.hash);
      
      // Check new balance
      const newBalance = await vusd.balanceOf(beneficiary.address);
      console.log('   New Balance:', ethers.formatUnits(newBalance, 18), 'VUSD');
      
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
  }
  
  // Final stats
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 FINAL STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const newTotalSupply = await vusd.totalSupply();
  console.log('New Total Supply:', ethers.formatUnits(newTotalSupply, 18), 'VUSD');
  console.log('Minted:', ethers.formatUnits(newTotalSupply - totalSupply, 18), 'VUSD');
}

main().catch(console.error);
