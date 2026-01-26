import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const DCB_PORT = 4010;
const LEMX_PORT = 4011;
const WS_PORT = 4012;

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY DATA STORE (SHARED BETWEEN DCB TREASURY & LEMX MINTING)
// ═══════════════════════════════════════════════════════════════════════════════
let locks = [];                    // All locks received
let lockReserves = [];             // Locks with remaining balance (after partial mint)
let mintRequests = [];             // Mint requests
let approvedMints = [];            // Approved mints waiting for execution
let completedMints = [];           // Completed/minted transactions
let rejectedMints = [];            // Rejected mints
let mintExplorerEvents = [];       // All events for Mint Explorer (shared)
let webhookEvents = [];            // Webhook events log

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
const generateId = () => Math.random().toString(36).substring(2, 15);
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');
const generateTxHash = () => '0x' + Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const generateAddress = () => '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

// Generate blockchain signature
const generateBlockchainSignature = (role, data) => ({
  role,
  address: generateAddress(),
  hash: sha256(JSON.stringify(data) + Date.now()),
  timestamp: new Date().toISOString(),
  blockNumber: Math.floor(Math.random() * 1000000) + 2000000,
  txHash: generateTxHash()
});

// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY API (Port 4010)
// ═══════════════════════════════════════════════════════════════════════════════
const dcbApp = express();
dcbApp.use(cors());
dcbApp.use(express.json());

dcbApp.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'dcb_treasury', timestamp: new Date().toISOString() });
});

dcbApp.get('/api/locks', (req, res) => {
  res.json({ success: true, data: locks, count: locks.length });
});

dcbApp.post('/api/locks', (req, res) => {
  const lock = {
    id: `LOCK-${generateId().toUpperCase()}`,
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  locks.push(lock);
  broadcastToWebSockets({ type: 'lock.created', data: lock });
  res.json({ success: true, data: lock });
});

dcbApp.get('/api/mint-requests', (req, res) => {
  res.json({ success: true, data: mintRequests, count: mintRequests.length });
});

dcbApp.get('/api/approved-mints', (req, res) => {
  res.json({ success: true, data: approvedMints, count: approvedMints.length });
});

dcbApp.get('/api/completed-mints', (req, res) => {
  res.json({ success: true, data: completedMints, count: completedMints.length });
});

dcbApp.get('/api/rejected-mints', (req, res) => {
  res.json({ success: true, data: rejectedMints, count: rejectedMints.length });
});

dcbApp.get('/api/lock-reserves', (req, res) => {
  res.json({ success: true, data: lockReserves, count: lockReserves.length });
});

// MINT EXPLORER - Shared events between DCB Treasury and LEMX Minting
dcbApp.get('/api/mint-explorer', (req, res) => {
  res.json({ success: true, data: mintExplorerEvents, count: mintExplorerEvents.length });
});

dcbApp.get('/api/webhooks/events', (req, res) => {
  res.json({ success: true, data: webhookEvents, count: webhookEvents.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESET SANDBOX - Clear all data and return to 0
// ═══════════════════════════════════════════════════════════════════════════════
dcbApp.post('/api/clear-all', (req, res) => {
  console.log('\n🔄 ═══════════════════════════════════════════════════════════════════');
  console.log('   RESET SANDBOX - CLEARING ALL DATA');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  // Store counts before clearing for logging
  const beforeCounts = {
    locks: locks.length,
    lockReserves: lockReserves.length,
    mintRequests: mintRequests.length,
    approvedMints: approvedMints.length,
    completedMints: completedMints.length,
    rejectedMints: rejectedMints.length,
    mintExplorerEvents: mintExplorerEvents.length,
    webhookEvents: webhookEvents.length
  };
  
  console.log('   Before reset:', JSON.stringify(beforeCounts));
  
  // Clear all arrays
  locks = [];
  lockReserves = [];
  mintRequests = [];
  approvedMints = [];
  completedMints = [];
  rejectedMints = [];
  mintExplorerEvents = [];
  webhookEvents = [];
  
  console.log('   ✅ All data cleared - Everything is now 0');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  // Broadcast reset event to all connected clients
  broadcastToWebSockets({ 
    type: 'sandbox.reset', 
    data: { 
      message: 'Sandbox has been reset',
      timestamp: new Date().toISOString(),
      beforeCounts
    } 
  });
  
  res.json({ 
    success: true, 
    message: 'All data cleared successfully',
    beforeCounts,
    afterCounts: {
      locks: 0,
      lockReserves: 0,
      mintRequests: 0,
      approvedMints: 0,
      completedMints: 0,
      rejectedMints: 0,
      mintExplorerEvents: 0,
      webhookEvents: 0
    }
  });
});

// Receive lock approval notification from LEMX Minting
dcbApp.post('/api/lock-approved', (req, res) => {
  console.log('\n📥 RECIBIENDO APROBACIÓN DE LOCK...');
  console.log('   Raw body:', JSON.stringify(req.body, null, 2));
  
  const { 
    lockId, 
    authorizationCode, 
    originalAmount, 
    approvedAmount, 
    remainingAmount,
    approvedBy, 
    approvedAt, 
    beneficiary, 
    bankName,
    signatures,
    blockchain // 🔗 Blockchain data from frontend
  } = req.body;
  
  console.log('   Parsed values:');
  console.log('     lockId:', lockId);
  console.log('     originalAmount:', originalAmount, typeof originalAmount);
  console.log('     approvedAmount:', approvedAmount, typeof approvedAmount);
  console.log('     remainingAmount:', remainingAmount, typeof remainingAmount);
  
  // Find and update the lock
  const lockIdx = locks.findIndex(l => l.lockId === lockId);
  const lock = lockIdx >= 0 ? locks[lockIdx] : null;
  
  console.log('   Lock found:', lock ? 'YES' : 'NO', lockIdx);
  if (lock) {
    console.log('   Current lock amount:', lock.lockDetails?.amount);
  }
  
  const remaining = parseFloat(remainingAmount || '0');
  console.log('   Remaining parsed:', remaining);
  
  if (lock) {
    if (remaining > 0) {
      // Update lock with remaining amount - keep it as pending with new amount
      lock.lockDetails.amount = remainingAmount;
      lock.originalAmount = originalAmount;
      lock.partiallyApproved = true;
      lock.lastApprovedAmount = approvedAmount;
      lock.lastApprovedBy = approvedBy;
      lock.lastApprovedAt = approvedAt;
    } else {
      // No remaining amount - mark as fully approved and remove from pending
      lock.status = 'approved';
      lock.approvedAmount = approvedAmount;
      lock.approvedBy = approvedBy;
      lock.approvedAt = approvedAt;
      lock.approvalSignatures = signatures;
      // Remove from locks array (it's fully consumed)
      locks.splice(lockIdx, 1);
    }
  }
  
  // If there's remaining amount, create a Lock Reserve entry
  if (remaining > 0) {
    const lockReserve = {
      id: `RESERVE-${generateId().toUpperCase()}`,
      originalLockId: lockId,
      authorizationCode: `RESERVE-${authorizationCode}`,
      amount: remainingAmount,
      currency: 'USD',
      status: 'reserved',
      beneficiary,
      bankName,
      createdAt: new Date().toISOString(),
      originalAmount,
      usedAmount: approvedAmount,
      signatures: [
        generateBlockchainSignature('LOCK_RESERVE_CONTRACT', { lockId, remainingAmount }),
        generateBlockchainSignature('CUSTODY_VAULT', { lockId, remainingAmount })
      ]
    };
    lockReserves.push(lockReserve);
    
    // Add to Mint Explorer
    const reserveEvent = {
      id: generateId(),
      type: 'LOCK_RESERVE',
      timestamp: new Date().toISOString(),
      lockId,
      authorizationCode,
      amount: remainingAmount,
      description: `Lock Reserve creado - Monto reservado: $${parseFloat(remainingAmount).toLocaleString()}`,
      actor: approvedBy,
      status: 'completed',
      signatures: lockReserve.signatures,
      blockchain: {
        network: 'LemonChain',
        chainId: 8866,
        txHash: lockReserve.signatures[0].txHash,
        blockNumber: lockReserve.signatures[0].blockNumber
      }
    };
    mintExplorerEvents.unshift(reserveEvent);
    
    broadcastToWebSockets({ type: 'lock.reserve.created', data: lockReserve });
  }
  
  // Create approved mint entry
  const approvedMint = {
    id: generateId(),
    lockId,
    authorizationCode,
    originalAmount,
    approvedAmount,
    remainingAmount,
    approvedBy,
    approvedAt,
    beneficiary,
    bankName,
    status: 'approved',
    signatures: signatures || [
      generateBlockchainSignature('DAES_APPROVER', { lockId, approvedAmount }),
      generateBlockchainSignature('BANK_APPROVER', { lockId, approvedAmount }),
      generateBlockchainSignature('LEMX_APPROVER', { lockId, approvedAmount })
    ]
  };
  approvedMints.push(approvedMint);
  
  // Add approval event to Mint Explorer with full blockchain traceability
  const approvalEvent = {
    id: generateId(),
    type: 'LOCK_APPROVED',
    timestamp: new Date().toISOString(),
    lockId,
    authorizationCode,
    amount: approvedAmount,
    description: `Lock aprobado para minting - Monto: $${parseFloat(approvedAmount).toLocaleString()}`,
    actor: approvedBy,
    status: 'completed',
    signatures: signatures || approvedMint.signatures,
    // 🔗 Full blockchain traceability
    blockchain: blockchain || {
      network: 'LemonChain',
      chainId: 1006,
      txHash: approvedMint.signatures?.[0]?.txHash || generateTxHash(),
      blockNumber: approvedMint.signatures?.[0]?.blockNumber || Math.floor(Math.random() * 1000000) + 2000000
    },
    details: {
      originalAmount,
      approvedAmount,
      remainingAmount,
      beneficiary,
      bankName,
      // 🔗 Blockchain signatures
      firstSignature: blockchain?.firstSignature || signatures?.[0]?.hash,
      secondSignature: blockchain?.secondSignature || signatures?.[1]?.hash,
      injectionId: blockchain?.injectionId,
      contracts: blockchain?.contracts
    }
  };
  mintExplorerEvents.unshift(approvalEvent);
  
  // Create webhook event
  const event = {
    id: generateId(),
    type: 'lock.approved',
    timestamp: new Date().toISOString(),
    payload: {
      lockId,
      authorizationCode,
      originalAmount,
      approvedAmount,
      remainingAmount,
      approvedBy,
      approvedAt,
      beneficiary,
      bankName,
      signatures: approvedMint.signatures
    },
    source: 'lemx_platform'
  };
  webhookEvents.unshift(event);
  
  // Broadcast to all WebSocket clients
  broadcastToWebSockets({ 
    type: 'lock.approved', 
    data: event,
    message: `🔓 Lock ${lockId} aprobado por ${approvedBy} - Monto: $${parseFloat(approvedAmount).toLocaleString()}`
  });
  
  console.log(`\n✅ LOCK APROBADO desde LEMX Minting`);
  console.log(`   Lock ID: ${lockId}`);
  console.log(`   Auth Code: ${authorizationCode}`);
  console.log(`   Monto Original: $${originalAmount}`);
  console.log(`   Monto Aprobado: $${approvedAmount}`);
  console.log(`   Monto Restante (Lock Reserve): $${remainingAmount || '0'}`);
  console.log(`   Aprobado por: ${approvedBy}`);
  console.log(`   Banco: ${bankName}\n`);
  
  res.json({ success: true, data: { event, approvedMint, lockReserve: remaining > 0 ? lockReserves[lockReserves.length - 1] : null } });
});

// Receive lock rejection notification from LEMX Minting
dcbApp.post('/api/lock-rejected', (req, res) => {
  const { lockId, authorizationCode, amount, rejectedBy, rejectedAt, reason, bankName, signatures } = req.body;
  
  // Find and update the lock
  const lock = locks.find(l => l.lockId === lockId);
  if (lock) {
    lock.status = 'rejected';
    lock.rejectedBy = rejectedBy;
    lock.rejectedAt = rejectedAt;
    lock.rejectionReason = reason;
  }
  
  // Create rejected mint entry
  const rejectedMint = {
    id: generateId(),
    lockId,
    authorizationCode,
    amount,
    rejectedBy,
    rejectedAt,
    reason,
    bankName,
    status: 'rejected',
    signatures: signatures || [
      generateBlockchainSignature('REJECTION_CONTRACT', { lockId, reason })
    ]
  };
  rejectedMints.push(rejectedMint);
  
  // Add rejection event to Mint Explorer
  const rejectionEvent = {
    id: generateId(),
    type: 'LOCK_REJECTED',
    timestamp: new Date().toISOString(),
    lockId,
    authorizationCode,
    amount,
    description: `Lock rechazado - Razón: ${reason}`,
    actor: rejectedBy,
    status: 'rejected',
    signatures: rejectedMint.signatures,
    blockchain: {
      network: 'LemonChain',
      chainId: 8866,
      txHash: rejectedMint.signatures[0].txHash,
      blockNumber: rejectedMint.signatures[0].blockNumber
    }
  };
  mintExplorerEvents.unshift(rejectionEvent);
  
  // Create webhook event
  const event = {
    id: generateId(),
    type: 'lock.rejected',
    timestamp: new Date().toISOString(),
    payload: { lockId, authorizationCode, amount, rejectedBy, rejectedAt, reason, bankName },
    source: 'lemx_platform'
  };
  webhookEvents.unshift(event);
  
  broadcastToWebSockets({ 
    type: 'lock.rejected', 
    data: event,
    message: `❌ Lock ${lockId} rechazado por ${rejectedBy} - Razón: ${reason}`
  });
  
  console.log(`\n❌ LOCK RECHAZADO desde LEMX Minting`);
  console.log(`   Lock ID: ${lockId}`);
  console.log(`   Razón: ${reason}`);
  console.log(`   Rechazado por: ${rejectedBy}\n`);
  
  res.json({ success: true, data: { event, rejectedMint } });
});

// Receive mint completion notification from LEMX Minting
dcbApp.post('/api/mint-completed', (req, res) => {
  const { 
    lockId, 
    authorizationCode, 
    publicationCode,
    amount, 
    mintedBy, 
    mintedAt, 
    txHash,
    blockNumber,
    beneficiary,
    bankName,
    signatures,
    lusdContractAddress,
    lockContractHash,
    lusdMintHash,
    blockchain // 🔗 Full blockchain data with 3 signatures
  } = req.body;
  
  console.log('\n🎉 RECIBIENDO NOTIFICACIÓN DE MINT COMPLETADO...');
  console.log('   Lock ID:', lockId);
  console.log('   Auth Code:', authorizationCode);
  console.log('   Publication Code:', publicationCode);
  console.log('   Amount:', amount, 'VUSD');
  console.log('   TX Hash:', txHash);
  console.log('   Lock Contract Hash:', lockContractHash || 'N/A');
  console.log('   VUSD Mint Hash:', lusdMintHash || 'N/A');
  
  // Find and update the lock
  const lock = locks.find(l => l.lockId === lockId);
  if (lock) {
    lock.status = 'minted';
    lock.mintedAt = mintedAt;
    lock.mintTxHash = txHash;
  }
  
  // Move from approved to completed
  const approvedIdx = approvedMints.findIndex(m => m.authorizationCode === authorizationCode);
  if (approvedIdx >= 0) {
    approvedMints.splice(approvedIdx, 1);
  }
  
  // Create completed mint entry
  const completedMint = {
    id: generateId(),
    lockId,
    authorizationCode,
    publicationCode,
    amount,
    mintedBy,
    mintedAt,
    txHash,
    blockNumber,
    beneficiary,
    bankName,
    lusdContractAddress,
    lockContractHash: lockContractHash || null,
    lusdMintHash: lusdMintHash || null,
    status: 'minted',
    signatures: signatures || [
      generateBlockchainSignature('VUSD_MINT_CONTRACT', { amount, beneficiary, txHash }),
      generateBlockchainSignature('LOCK_CONTRACT', { lockId, lockContractHash }),
      generateBlockchainSignature('TREASURY_VAULT', { amount }),
      generateBlockchainSignature('LEMX_FINAL_SIGNER', { publicationCode })
    ]
  };
  completedMints.push(completedMint);
  
  // Add mint completion event to Mint Explorer with FULL blockchain traceability
  const mintEvent = {
    id: generateId(),
    type: 'MINT_COMPLETED',
    timestamp: new Date().toISOString(),
    lockId,
    authorizationCode,
    publicationCode,
    amount,
    description: `🎉 Minting completado - ${parseFloat(amount).toLocaleString()} VUSD creados en LemonChain`,
    actor: mintedBy,
    status: 'completed',
    signatures: completedMint.signatures,
    // 🔗 Full blockchain traceability with 3 signatures
    blockchain: {
      network: blockchain?.network || 'LemonChain',
      chainId: blockchain?.chainId || 1006,
      txHash,
      blockNumber,
      lusdContract: lusdContractAddress,
      lockContractHash: lockContractHash || null,
      lusdMintHash: lusdMintHash || null,
      // 🔗 Three signatures for complete traceability
      signatures: {
        first: blockchain?.signatures?.first || null,   // DCB Treasury (USD Injection)
        second: blockchain?.signatures?.second || null, // Treasury Minting (Lock Accept)
        third: blockchain?.signatures?.third || null    // Backed Certificate (VUSD Mint)
      },
      certificateId: blockchain?.certificateId || null,
      backedSignature: blockchain?.backedSignature || null,
      contracts: blockchain?.contracts || {
        usd: null,
        lockReserve: null,
        lusdMinter: null,
        lusd: lusdContractAddress
      }
    },
    details: {
      beneficiary,
      bankName,
      publicationCode,
      mintedBy,
      mintedAt,
      // 🔗 Signature details
      firstSignature: blockchain?.signatures?.first || 'N/A',
      secondSignature: blockchain?.signatures?.second || 'N/A',
      thirdSignature: blockchain?.signatures?.third || blockchain?.backedSignature || 'N/A'
    }
  };
  mintExplorerEvents.unshift(mintEvent);
  
  // Create webhook event
  const event = {
    id: generateId(),
    type: 'mint.completed',
    timestamp: new Date().toISOString(),
    payload: completedMint,
    source: 'lemx_platform'
  };
  webhookEvents.unshift(event);
  
  broadcastToWebSockets({ 
    type: 'mint.completed', 
    data: event,
    message: `✅ Minting completado - ${parseFloat(amount).toLocaleString()} VUSD - TX: ${txHash.substring(0, 10)}...`
  });
  
  console.log(`\n🎉 MINT COMPLETADO desde LEMX Minting`);
  console.log(`   Lock ID: ${lockId}`);
  console.log(`   Publication Code: ${publicationCode}`);
  console.log(`   Amount: ${amount} VUSD`);
  console.log(`   TX Hash: ${txHash}`);
  console.log(`   Minteado por: ${mintedBy}\n`);
  
  res.json({ success: true, data: { event, completedMint } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEMX MINTING API (Port 4011)
// ═══════════════════════════════════════════════════════════════════════════════
const lemxApp = express();
lemxApp.use(cors());
lemxApp.use(express.json());

lemxApp.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'lemx_minting', timestamp: new Date().toISOString() });
});

// RESET SANDBOX - Also available on LEMX port
lemxApp.post('/api/clear-all', (req, res) => {
  console.log('\n🔄 ═══════════════════════════════════════════════════════════════════');
  console.log('   RESET SANDBOX (via LEMX) - CLEARING ALL DATA');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const beforeCounts = {
    locks: locks.length,
    lockReserves: lockReserves.length,
    mintRequests: mintRequests.length,
    approvedMints: approvedMints.length,
    completedMints: completedMints.length,
    rejectedMints: rejectedMints.length,
    mintExplorerEvents: mintExplorerEvents.length,
    webhookEvents: webhookEvents.length
  };
  
  console.log('   Before reset:', JSON.stringify(beforeCounts));
  
  locks = [];
  lockReserves = [];
  mintRequests = [];
  approvedMints = [];
  completedMints = [];
  rejectedMints = [];
  mintExplorerEvents = [];
  webhookEvents = [];
  
  console.log('   ✅ All data cleared - Everything is now 0');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
  
  broadcastToWebSockets({ 
    type: 'sandbox.reset', 
    data: { 
      message: 'Sandbox has been reset',
      timestamp: new Date().toISOString(),
      beforeCounts
    } 
  });
  
  res.json({ 
    success: true, 
    message: 'All data cleared successfully',
    beforeCounts,
    afterCounts: {
      locks: 0,
      lockReserves: 0,
      mintRequests: 0,
      approvedMints: 0,
      completedMints: 0,
      rejectedMints: 0,
      mintExplorerEvents: 0,
      webhookEvents: 0
    }
  });
});

lemxApp.get('/api/locks', (req, res) => {
  // Return only pending locks (not approved, rejected, or minted)
  const pendingLocks = locks.filter(l => l.status === 'pending');
  res.json({ success: true, data: pendingLocks, count: pendingLocks.length });
});

lemxApp.get('/api/all-locks', (req, res) => {
  res.json({ success: true, data: locks, count: locks.length });
});

lemxApp.get('/api/mint-requests', (req, res) => {
  res.json({ success: true, data: mintRequests, count: mintRequests.length });
});

lemxApp.get('/api/approved-mints', (req, res) => {
  res.json({ success: true, data: approvedMints, count: approvedMints.length });
});

lemxApp.get('/api/completed-mints', (req, res) => {
  res.json({ success: true, data: completedMints, count: completedMints.length });
});

lemxApp.get('/api/rejected-mints', (req, res) => {
  res.json({ success: true, data: rejectedMints, count: rejectedMints.length });
});

lemxApp.get('/api/lock-reserves', (req, res) => {
  res.json({ success: true, data: lockReserves, count: lockReserves.length });
});

// MINT EXPLORER - Shared events
lemxApp.get('/api/mint-explorer', (req, res) => {
  res.json({ success: true, data: mintExplorerEvents, count: mintExplorerEvents.length });
});

lemxApp.post('/api/mint-requests/:id/approve', (req, res) => {
  const request = mintRequests.find(r => r.id === req.params.id);
  if (request) {
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    broadcastToWebSockets({ type: 'mint.approved', data: request });
    res.json({ success: true, data: request });
  } else {
    res.status(404).json({ success: false, error: 'Request not found' });
  }
});

lemxApp.post('/api/mint-requests/:id/reject', (req, res) => {
  const request = mintRequests.find(r => r.id === req.params.id);
  if (request) {
    request.status = 'rejected';
    request.rejectedAt = new Date().toISOString();
    request.rejectionReason = req.body.reason || 'Rejected by operator';
    broadcastToWebSockets({ type: 'mint.rejected', data: request });
    res.json({ success: true, data: request });
  } else {
    res.status(404).json({ success: false, error: 'Request not found' });
  }
});

lemxApp.post('/api/mint-requests/:id/complete', (req, res) => {
  const request = mintRequests.find(r => r.id === req.params.id);
  if (request) {
    request.status = 'minted';
    request.mintedAt = new Date().toISOString();
    request.txHash = req.body.txHash || generateTxHash();
    completedMints.push(request);
    broadcastToWebSockets({ type: 'mint.completed', data: request });
    res.json({ success: true, data: request });
  } else {
    res.status(404).json({ success: false, error: 'Request not found' });
  }
});

lemxApp.post('/api/mint-with-code', (req, res) => {
  const { authorizationCode } = req.body;
  const lock = locks.find(l => l.authorizationCode === authorizationCode);
  const request = mintRequests.find(r => r.authorizationCode === authorizationCode);
  
  if (lock && request) {
    res.json({ success: true, data: { lock, request } });
  } else {
    res.status(404).json({ success: false, error: 'Code not found' });
  }
});

// Sandbox endpoint to simulate incoming lock from DCB Treasury
lemxApp.post('/api/sandbox/simulate-lock', (req, res) => {
  const lockId = `LOCK-${Date.now().toString(36).toUpperCase()}`;
  const authCode = `MINT-${generateId().toUpperCase()}-${generateId().substring(0,6).toUpperCase()}`;
  
  const lock = {
    id: `${lockId}-${generateId().toUpperCase()}`,
    lockId,
    authorizationCode: authCode,
    timestamp: new Date().toISOString(),
    status: 'pending',
    lockDetails: {
      amount: req.body.amount || (Math.random() * 100000 + 10000).toFixed(2),
      currency: 'USD',
      beneficiary: req.body.beneficiary || generateAddress(),
      custodyVault: generateAddress(),
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    bankInfo: {
      bankId: 'BANK-DCB-001',
      bankName: 'Digital Commercial Bank Ltd.',
      signerAddress: generateAddress()
    },
    sourceOfFunds: {
      accountId: 'ACC-' + Date.now().toString(36).toUpperCase(),
      accountName: 'DCB Treasury Reserve',
      accountType: 'banking',
      originalBalance: (Math.random() * 10000000 + 1000000).toFixed(2)
    },
    signatures: [
      generateBlockchainSignature('DAES_SIGNER', { authCode }),
      generateBlockchainSignature('BANK_SIGNER', { lockId })
    ],
    blockchain: {
      txHash: generateTxHash(),
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      chainId: 8866,
      network: 'LemonChain'
    },
    isoData: {
      messageId: `ISO-${Date.now()}`,
      uetr: `${generateId()}-${generateId()}-${generateId()}-${generateId()}`.substring(0, 36),
      isoHash: sha256(`ISO-${Date.now()}-${authCode}`)
    },
    receivedAt: new Date().toISOString()
  };
  
  locks.push(lock);
  
  // Also create a mint request
  const mintRequest = {
    id: generateId(),
    authorizationCode: authCode,
    lockId: lockId,
    requestedAmount: lock.lockDetails.amount,
    tokenSymbol: 'VUSD',
    beneficiary: lock.lockDetails.beneficiary,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: lock.lockDetails.expiry
  };
  mintRequests.push(mintRequest);
  
  // Add to Mint Explorer
  const lockEvent = {
    id: generateId(),
    type: 'LOCK_RECEIVED',
    timestamp: new Date().toISOString(),
    lockId,
    authorizationCode: authCode,
    amount: lock.lockDetails.amount,
    description: `Lock recibido desde DCB Treasury - Monto: $${parseFloat(lock.lockDetails.amount).toLocaleString()}`,
    actor: 'DCB Treasury',
    status: 'pending',
    signatures: lock.signatures,
    blockchain: lock.blockchain,
    details: {
      bankName: lock.bankInfo.bankName,
      beneficiary: lock.lockDetails.beneficiary
    }
  };
  mintExplorerEvents.unshift(lockEvent);
  
  // Broadcast events
  broadcastToWebSockets({ type: 'lock.created', data: { event: { payload: lock } } });
  broadcastToWebSockets({ type: 'mint.requested', data: { event: { payload: mintRequest } } });
  
  console.log(`\n🔒 SANDBOX: Lock simulado desde DCB Treasury`);
  console.log(`   Lock ID: ${lockId}`);
  console.log(`   Auth Code: ${authCode}`);
  console.log(`   Amount: $${lock.lockDetails.amount}`);
  
  res.json({ success: true, data: { lock, mintRequest } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER (Port 4012)
// ═══════════════════════════════════════════════════════════════════════════════
const wsServer = http.createServer();
const wss = new WebSocketServer({ server: wsServer });

let wsClients = [];

wss.on('connection', (ws, req) => {
  console.log(`🔌 New WebSocket client connected from ${req.socket.remoteAddress}`);
  wsClients.push(ws);
  
  // Send initial state
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: { 
      locks, 
      lockReserves,
      mintRequests, 
      approvedMints,
      completedMints,
      rejectedMints,
      mintExplorerEvents
    }
  }));
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    wsClients = wsClients.filter(client => client !== ws);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message received:', data.type);
    } catch (e) {
      console.error('Invalid WebSocket message');
    }
  });
});

function broadcastToWebSockets(message) {
  const payload = JSON.stringify(message);
  console.log(`📡 Broadcast [${message.type}] to ${wsClients.length} clients`);
  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVERS
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n🌉 Bridge conectando DCB Treasury (${DCB_PORT}) ↔ LEMX Minting (${LEMX_PORT}) ↔ WebSocket (${WS_PORT})\n`);

dcbApp.listen(DCB_PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  🏦 DCB Treasury API running on http://localhost:${DCB_PORT}            ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                                       ║');
  console.log('║    GET  /api/health                                               ║');
  console.log('║    GET  /api/locks                                                ║');
  console.log('║    GET  /api/lock-reserves                                        ║');
  console.log('║    GET  /api/approved-mints                                       ║');
  console.log('║    GET  /api/completed-mints                                      ║');
  console.log('║    GET  /api/rejected-mints                                       ║');
  console.log('║    GET  /api/mint-explorer  ← SHARED EXPLORER                     ║');
  console.log('║    POST /api/lock-approved  ← FROM LEMX                           ║');
  console.log('║    POST /api/lock-rejected  ← FROM LEMX                           ║');
  console.log('║    POST /api/mint-completed ← FROM LEMX                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
});

lemxApp.listen(LEMX_PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  🪙 LEMX Minting Platform API running on http://localhost:${LEMX_PORT}   ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                                       ║');
  console.log('║    GET  /api/health                                               ║');
  console.log('║    GET  /api/locks  (pending only)                                ║');
  console.log('║    GET  /api/lock-reserves                                        ║');
  console.log('║    GET  /api/approved-mints                                       ║');
  console.log('║    GET  /api/completed-mints                                      ║');
  console.log('║    GET  /api/rejected-mints                                       ║');
  console.log('║    GET  /api/mint-explorer  ← SHARED EXPLORER                     ║');
  console.log('║    POST /api/sandbox/simulate-lock  → SANDBOX                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
});

wsServer.listen(WS_PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  📡 WebSocket Server running on ws://localhost:${WS_PORT}              ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║  Real-time events:                                                ║');
  console.log('║    - lock.created / lock.approved / lock.rejected                 ║');
  console.log('║    - lock.reserve.created                                         ║');
  console.log('║    - mint.approved / mint.rejected / mint.completed               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
});
