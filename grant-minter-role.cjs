const { ethers } = require('ethers');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const VUSD_CONTRACT = '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b';
const ADMIN_PRIVATE_KEY = '72476caaa12e83677bc5c704dd8dd19f6220139909f4cbff9c8ca47543b4dedd';
const MINTER_ADDRESS = '0xaccA35529b2FC2041dFb124F83f52120E24377B2'; // Same as admin - self-grant

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';

// MINTER_ROLE hash = keccak256("MINTER_ROLE")
const MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';

// Minimal ABI for AccessControl
const VUSD_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function mint(address to, uint256 amount) external',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
];

async function main() {
  console.log('');
  console.log('================================================================================');
  console.log('     GRANT MINTER_ROLE ON VUSD CONTRACT - LEMONCHAIN');
  console.log('================================================================================');
  console.log('');

  // Connect to LemonChain
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  
  console.log('CONFIGURATION:');
  console.log('--------------------------------------------------------------------------------');
  console.log('  VUSD Contract:  ' + VUSD_CONTRACT);
  console.log('  Admin Wallet:   ' + wallet.address);
  console.log('  Minter Address: ' + MINTER_ADDRESS);
  console.log('');

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('  Admin Balance:  ' + ethers.formatEther(balance) + ' LEMON');
  console.log('');

  if (balance === 0n) {
    console.log('ERROR: No LEMON for gas!');
    process.exit(1);
  }

  // Connect to VUSD contract
  const vusd = new ethers.Contract(VUSD_CONTRACT, VUSD_ABI, wallet);

  // Check current state
  console.log('CURRENT STATE:');
  console.log('--------------------------------------------------------------------------------');
  
  const name = await vusd.name();
  const symbol = await vusd.symbol();
  const totalSupply = await vusd.totalSupply();
  
  console.log('  Token Name:     ' + name);
  console.log('  Token Symbol:   ' + symbol);
  console.log('  Total Supply:   ' + ethers.formatEther(totalSupply) + ' VUSD');
  console.log('');

  // Check if already has MINTER_ROLE
  const hasMinterRole = await vusd.hasRole(MINTER_ROLE, MINTER_ADDRESS);
  console.log('  ' + MINTER_ADDRESS.slice(0,10) + '... has MINTER_ROLE: ' + (hasMinterRole ? 'YES' : 'NO'));
  console.log('');

  if (hasMinterRole) {
    console.log('SUCCESS: Address already has MINTER_ROLE!');
    console.log('');
    console.log('================================================================================');
    return;
  }

  // Grant MINTER_ROLE
  console.log('GRANTING MINTER_ROLE...');
  console.log('--------------------------------------------------------------------------------');
  
  try {
    console.log('  Sending transaction...');
    const tx = await vusd.grantRole(MINTER_ROLE, MINTER_ADDRESS);
    console.log('  TX Hash: ' + tx.hash);
    console.log('  Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('  Block:   ' + receipt.blockNumber);
    console.log('  Gas Used: ' + receipt.gasUsed.toString());
    console.log('');
    
    // Verify
    const hasRoleNow = await vusd.hasRole(MINTER_ROLE, MINTER_ADDRESS);
    console.log('VERIFICATION:');
    console.log('--------------------------------------------------------------------------------');
    console.log('  ' + MINTER_ADDRESS.slice(0,10) + '... has MINTER_ROLE: ' + (hasRoleNow ? 'YES' : 'NO'));
    console.log('');
    
    if (hasRoleNow) {
      console.log('SUCCESS! MINTER_ROLE granted successfully!');
      console.log('');
      console.log('Explorer: https://explorer.lemonchain.io/tx/' + tx.hash);
    } else {
      console.log('WARNING: Transaction succeeded but role not detected. Check explorer.');
    }
    
  } catch (error) {
    console.log('');
    console.log('ERROR: ' + error.message);
    if (error.reason) {
      console.log('Reason: ' + error.reason);
    }
  }

  console.log('');
  console.log('================================================================================');
  console.log('');
}

main().catch(console.error);
