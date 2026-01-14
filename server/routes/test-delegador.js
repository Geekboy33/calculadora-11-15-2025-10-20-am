import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


import crypto from 'crypto';

const router = express.Router();

// POST /api/test-delegador/emit-issue
router.post('/emit-issue', async (req, res) => {
  try {
    const { amount, recipientAddress, delegatorAddress } = req.body;
    
    if (!amount || !recipientAddress || !delegatorAddress) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const amountNum = parseFloat(amount);
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000) + 24168950;
    
    console.log(`[DELEGADOR TEST] Emitiendo ${amountNum} USDT...`);
    
    return res.json({
      success: true,
      type: 'USDT_DELEGATOR_TEST',
      message: `Successfully emitted ${amountNum} USDT event`,
      amount: amountNum,
      recipientAddress,
      delegatorAddress,
      transaction: {
        hash: txHash,
        blockNumber: blockNumber,
        status: 'Success',
        link: `https://etherscan.io/tx/${txHash}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;





