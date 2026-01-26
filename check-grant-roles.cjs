const { ethers } = require('ethers');

const LEMONCHAIN_RPC = 'https://rpc.lemonchain.io';
const USD_CONTRACT = '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f';
const ADMIN_KEY = '1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080';
const ADMIN_ADDRESS = '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559';

const USD_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function TREASURY_MINTING_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function DAES_OPERATOR_ROLE() view returns (bytes32)'
];

async function main() {
  console.log('🔗 Connecting to LemonChain...');
  const provider = new ethers.JsonRpcProvider(LEMONCHAIN_RPC);
  const wallet = new ethers.Wallet(ADMIN_KEY, provider);
  
  const usd = new ethers.Contract(USD_CONTRACT, USD_ABI, wallet);
  
  // Get role hashes
  const adminRole = await usd.DEFAULT_ADMIN_ROLE();
  const minterRole = await usd.MINTER_ROLE();
  const daesRole = await usd.DAES_OPERATOR_ROLE();
  const treasuryRole = await usd.TREASURY_MINTING_ROLE();
  
  console.log('\n📋 Role Hashes:');
  console.log('   DEFAULT_ADMIN_ROLE:', adminRole);
  console.log('   MINTER_ROLE:', minterRole);
  console.log('   DAES_OPERATOR_ROLE:', daesRole);
  console.log('   TREASURY_MINTING_ROLE:', treasuryRole);
  
  // Check current roles
  console.log('\n👤 Checking roles for:', ADMIN_ADDRESS);
  console.log('   Has DEFAULT_ADMIN_ROLE:', await usd.hasRole(adminRole, ADMIN_ADDRESS));
  console.log('   Has MINTER_ROLE:', await usd.hasRole(minterRole, ADMIN_ADDRESS));
  console.log('   Has DAES_OPERATOR_ROLE:', await usd.hasRole(daesRole, ADMIN_ADDRESS));
  console.log('   Has TREASURY_MINTING_ROLE:', await usd.hasRole(treasuryRole, ADMIN_ADDRESS));
  
  // Grant TREASURY_MINTING_ROLE if not already granted
  const hasTreasuryRole = await usd.hasRole(treasuryRole, ADMIN_ADDRESS);
  if (!hasTreasuryRole) {
    console.log('\n🔑 Granting TREASURY_MINTING_ROLE to admin...');
    const tx = await usd.grantRole(treasuryRole, ADMIN_ADDRESS, { gasLimit: 200000 });
    console.log('   TX:', tx.hash);
    await tx.wait();
    console.log('   ✅ TREASURY_MINTING_ROLE granted!');
  } else {
    console.log('\n✅ Admin already has TREASURY_MINTING_ROLE');
  }
  
  // Verify
  console.log('\n📋 Final verification:');
  console.log('   Has TREASURY_MINTING_ROLE:', await usd.hasRole(treasuryRole, ADMIN_ADDRESS));
}

main().catch(console.error);
