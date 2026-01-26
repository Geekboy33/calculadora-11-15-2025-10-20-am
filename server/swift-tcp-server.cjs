/**
 * SWIFT TCP/IP, API & SFTP Server
 * Direct SWIFT Payment Transmission Server
 * 
 * This server handles:
 * - TCP/IP Socket connections for SWIFT messages
 * - REST API endpoints for payment transmission
 * - SFTP file transfer simulation
 * - ACK/NACK protocol handling
 * - Message logging and audit trail
 */

const net = require('net');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TCP_PORT: 5000,
  TLS_PORT: 5001,
  API_PORT: 5002,
  SFTP_PORT: 5003,
  MAX_MESSAGE_SIZE: 10 * 1024 * 1024, // 10 MB
  RETRY_ATTEMPTS: 3,
  RETRY_INTERVALS: [60000, 180000, 300000], // 60s, 180s, 300s
  ACK_TIMEOUT: 30000, // 30 seconds
  LOG_DIR: path.join(__dirname, 'data', 'swift-logs'),
  CERTS_DIR: path.join(__dirname, 'certs'),
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.LOG_DIR)) {
  fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const connections = new Map(); // Active TCP connections
const messageQueue = []; // Pending messages
const transmissionLog = []; // Audit trail
const pendingAcks = new Map(); // Messages waiting for ACK
const retryQueue = []; // Messages to retry
const ipWhitelist = new Set(['127.0.0.1', '::1', 'localhost']); // Allowed IPs
const certificates = new Map(); // TLS certificates
const statistics = {
  totalMessages: 0,
  successfulMessages: 0,
  failedMessages: 0,
  totalBytes: 0,
  avgLatency: 0,
  uptime: Date.now(),
  lastActivity: null,
};
const alerts = []; // System alerts
const backupConnections = new Map(); // Backup server connections

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateMessageId() {
  return `MSG${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateTransactionRef() {
  return `TRX${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function calculateChecksum(data) {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8).toUpperCase();
}

function logTransmission(entry) {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    id: generateMessageId(),
  };
  transmissionLog.push(logEntry);
  
  // Write to file
  const logFile = path.join(CONFIG.LOG_DIR, `swift_${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  // Keep only last 1000 entries in memory
  if (transmissionLog.length > 1000) {
    transmissionLog.shift();
  }
  
  return logEntry;
}

function validateSwiftMessage(message) {
  const errors = [];
  
  // Check required fields
  if (!message.messageType) errors.push('Missing messageType');
  if (!message.senderBic) errors.push('Missing senderBic');
  if (!message.receiverBic) errors.push('Missing receiverBic');
  if (!message.amount || message.amount <= 0) errors.push('Invalid amount');
  if (!message.currency) errors.push('Missing currency');
  
  // Validate BIC format (8 or 11 characters)
  const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  if (message.senderBic && !bicRegex.test(message.senderBic)) {
    errors.push('Invalid sender BIC format');
  }
  if (message.receiverBic && !bicRegex.test(message.receiverBic)) {
    errors.push('Invalid receiver BIC format');
  }
  
  // Validate currency (ISO 4217)
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'AED', 'SAR', 'CNY', 'HKD', 'SGD'];
  if (message.currency && !validCurrencies.includes(message.currency)) {
    errors.push('Invalid currency code');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACK/NACK PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════════

function createAckResponse(reference, originalMessage) {
  return {
    status: 'ACK',
    reference,
    originalReference: originalMessage.reference,
    timestamp: new Date().toISOString(),
    message: 'Payment received and validated successfully',
    details: {
      messageType: originalMessage.messageType,
      amount: originalMessage.amount,
      currency: originalMessage.currency,
      receiverBic: originalMessage.receiverBic,
      checksum: calculateChecksum(JSON.stringify(originalMessage)),
    },
  };
}

function createNackResponse(reference, errorCode, errorMessage, originalMessage) {
  const errorCodes = {
    'B001': 'Invalid message format',
    'B002': 'Missing required field',
    'B003': 'Invalid BIC code',
    'B004': 'Amount exceeds limit',
    'B005': 'Currency not supported',
    'B006': 'Duplicate transaction',
    'B007': 'Receiver not found',
    'B008': 'Insufficient funds',
    'B009': 'Sanctions screening failed',
    'B010': 'Connection timeout',
  };
  
  return {
    status: 'NACK',
    reference,
    originalReference: originalMessage?.reference,
    timestamp: new Date().toISOString(),
    errorCode,
    errorDescription: errorCodes[errorCode] || 'Unknown error',
    message: errorMessage,
    details: originalMessage ? {
      messageType: originalMessage.messageType,
      senderBic: originalMessage.senderBic,
      receiverBic: originalMessage.receiverBic,
    } : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TCP/IP SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const tcpServer = net.createServer((socket) => {
  const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[TCP] New connection from ${connectionId}`);
  
  connections.set(connectionId, {
    socket,
    connectedAt: new Date().toISOString(),
    messagesReceived: 0,
    messagesSent: 0,
    lastActivity: new Date().toISOString(),
  });
  
  logTransmission({
    type: 'CONNECTION',
    protocol: 'TCP/IP',
    direction: 'INBOUND',
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    status: 'CONNECTED',
  });
  
  let buffer = '';
  
  socket.on('data', (data) => {
    buffer += data.toString();
    
    // Check for complete message (ends with newline or specific delimiter)
    const messages = buffer.split('\n');
    buffer = messages.pop(); // Keep incomplete message in buffer
    
    messages.forEach((msgStr) => {
      if (!msgStr.trim()) return;
      
      try {
        const message = JSON.parse(msgStr);
        const conn = connections.get(connectionId);
        if (conn) {
          conn.messagesReceived++;
          conn.lastActivity = new Date().toISOString();
        }
        
        console.log(`[TCP] Received message:`, message.messageType || 'UNKNOWN');
        
        // Validate message
        const validation = validateSwiftMessage(message);
        
        if (validation.valid) {
          // Process message
          const reference = generateTransactionRef();
          const ack = createAckResponse(reference, message);
          
          logTransmission({
            type: 'MESSAGE',
            protocol: 'TCP/IP',
            direction: 'INBOUND',
            messageType: message.messageType,
            reference,
            senderBic: message.senderBic,
            receiverBic: message.receiverBic,
            amount: message.amount,
            currency: message.currency,
            status: 'ACK',
            checksum: calculateChecksum(msgStr),
          });
          
          // Send ACK
          socket.write(JSON.stringify(ack) + '\n');
          
          if (conn) conn.messagesSent++;
        } else {
          // Send NACK
          const nack = createNackResponse(
            generateTransactionRef(),
            'B002',
            validation.errors.join('; '),
            message
          );
          
          logTransmission({
            type: 'MESSAGE',
            protocol: 'TCP/IP',
            direction: 'INBOUND',
            messageType: message.messageType || 'UNKNOWN',
            status: 'NACK',
            errorCode: 'B002',
            errors: validation.errors,
          });
          
          socket.write(JSON.stringify(nack) + '\n');
        }
      } catch (err) {
        console.error(`[TCP] Parse error:`, err.message);
        
        const nack = createNackResponse(
          generateTransactionRef(),
          'B001',
          'Invalid JSON format: ' + err.message,
          null
        );
        
        socket.write(JSON.stringify(nack) + '\n');
      }
    });
  });
  
  socket.on('close', () => {
    console.log(`[TCP] Connection closed: ${connectionId}`);
    connections.delete(connectionId);
    
    logTransmission({
      type: 'CONNECTION',
      protocol: 'TCP/IP',
      direction: 'INBOUND',
      remoteAddress: socket.remoteAddress,
      status: 'DISCONNECTED',
    });
  });
  
  socket.on('error', (err) => {
    console.error(`[TCP] Socket error: ${err.message}`);
    
    logTransmission({
      type: 'ERROR',
      protocol: 'TCP/IP',
      error: err.message,
      status: 'ERROR',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REST API SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json({ limit: '10mb' }));

// Middleware for API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // For demo purposes, accept any key or no key
  // In production, validate against stored keys
  req.apiKeyValid = !!apiKey;
  next();
};

// Health check
apiApp.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: connections.size,
    queueLength: messageQueue.length,
  });
});

// Get server status
apiApp.get('/api/swift/status', (req, res) => {
  res.json({
    tcpServer: {
      running: tcpServer.listening,
      port: CONFIG.TCP_PORT,
      connections: connections.size,
    },
    apiServer: {
      running: true,
      port: CONFIG.API_PORT,
    },
    statistics: {
      totalTransmissions: transmissionLog.length,
      queuedMessages: messageQueue.length,
      pendingAcks: pendingAcks.size,
    },
    lastActivity: transmissionLog.length > 0 ? transmissionLog[transmissionLog.length - 1].timestamp : null,
  });
});

// Get active connections
apiApp.get('/api/swift/connections', (req, res) => {
  const conns = [];
  connections.forEach((conn, id) => {
    conns.push({
      id,
      connectedAt: conn.connectedAt,
      messagesReceived: conn.messagesReceived,
      messagesSent: conn.messagesSent,
      lastActivity: conn.lastActivity,
    });
  });
  res.json({ connections: conns });
});

// Get transmission log
apiApp.get('/api/swift/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type; // MESSAGE, CONNECTION, ERROR
  
  let logs = [...transmissionLog];
  
  if (type) {
    logs = logs.filter(l => l.type === type);
  }
  
  logs = logs.slice(-limit - offset).slice(0, limit);
  
  res.json({
    logs: logs.reverse(),
    total: transmissionLog.length,
    limit,
    offset,
  });
});

// Send SWIFT message via API
apiApp.post('/api/swift/send', validateApiKey, (req, res) => {
  const message = req.body;
  
  // Validate message
  const validation = validateSwiftMessage(message);
  
  if (!validation.valid) {
    const nack = createNackResponse(
      generateTransactionRef(),
      'B002',
      validation.errors.join('; '),
      message
    );
    
    logTransmission({
      type: 'MESSAGE',
      protocol: 'REST_API',
      direction: 'INBOUND',
      messageType: message.messageType || 'UNKNOWN',
      status: 'NACK',
      errorCode: 'B002',
      errors: validation.errors,
    });
    
    return res.status(400).json(nack);
  }
  
  // Process message
  const reference = generateTransactionRef();
  const ack = createAckResponse(reference, message);
  
  logTransmission({
    type: 'MESSAGE',
    protocol: 'REST_API',
    direction: 'INBOUND',
    messageType: message.messageType,
    reference,
    senderBic: message.senderBic,
    receiverBic: message.receiverBic,
    amount: message.amount,
    currency: message.currency,
    status: 'ACK',
    checksum: calculateChecksum(JSON.stringify(message)),
  });
  
  res.json(ack);
});

// Test connection to remote server
apiApp.post('/api/swift/test-connection', async (req, res) => {
  const { host, port, protocol, timeout = 5000 } = req.body;
  
  if (!host || !port) {
    return res.status(400).json({ error: 'Host and port are required' });
  }
  
  const startTime = Date.now();
  
  try {
    const result = await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.connect(port, host, () => {
        const latency = Date.now() - startTime;
        socket.destroy();
        resolve({
          success: true,
          host,
          port,
          latency,
          protocol: protocol || 'TCP',
          timestamp: new Date().toISOString(),
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
    
    logTransmission({
      type: 'CONNECTION_TEST',
      protocol: 'TCP/IP',
      host,
      port,
      status: 'SUCCESS',
      latency: result.latency,
    });
    
    res.json(result);
  } catch (err) {
    logTransmission({
      type: 'CONNECTION_TEST',
      protocol: 'TCP/IP',
      host,
      port,
      status: 'FAILED',
      error: err.message,
    });
    
    res.status(500).json({
      success: false,
      host,
      port,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// SFTP simulation endpoint
apiApp.post('/api/swift/sftp/upload', validateApiKey, (req, res) => {
  const { host, port, username, remotePath, filename, content, messageType } = req.body;
  
  if (!host || !filename || !content) {
    return res.status(400).json({ error: 'Host, filename, and content are required' });
  }
  
  // Simulate SFTP upload
  const reference = generateTransactionRef();
  const uploadResult = {
    success: true,
    reference,
    filename,
    remotePath: remotePath || '/incoming/swift',
    fullPath: `${remotePath || '/incoming/swift'}/${filename}`,
    size: Buffer.byteLength(content, 'utf8'),
    checksum: calculateChecksum(content),
    timestamp: new Date().toISOString(),
    host,
    port: port || 22,
    username: username || 'swift_user',
    messageType: messageType || 'MT103',
  };
  
  // Save file locally for demo
  const localPath = path.join(CONFIG.LOG_DIR, 'sftp_uploads');
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }
  fs.writeFileSync(path.join(localPath, filename), content);
  
  logTransmission({
    type: 'SFTP_UPLOAD',
    protocol: 'SFTP',
    direction: 'OUTBOUND',
    reference,
    filename,
    remotePath: uploadResult.fullPath,
    size: uploadResult.size,
    host,
    status: 'SUCCESS',
  });
  
  res.json(uploadResult);
});

// SFTP list files
apiApp.get('/api/swift/sftp/list', (req, res) => {
  const localPath = path.join(CONFIG.LOG_DIR, 'sftp_uploads');
  
  if (!fs.existsSync(localPath)) {
    return res.json({ files: [] });
  }
  
  const files = fs.readdirSync(localPath).map(filename => {
    const stats = fs.statSync(path.join(localPath, filename));
    return {
      filename,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  });
  
  res.json({ files });
});

// Send TCP message to remote server
apiApp.post('/api/swift/tcp/send', async (req, res) => {
  const { host, port, message, timeout = 30000 } = req.body;
  
  if (!host || !port || !message) {
    return res.status(400).json({ error: 'Host, port, and message are required' });
  }
  
  const reference = generateTransactionRef();
  const startTime = Date.now();
  
  try {
    const result = await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let responseData = '';
      
      socket.setTimeout(timeout);
      
      socket.connect(port, host, () => {
        // Send message
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        socket.write(payload + '\n');
        
        logTransmission({
          type: 'MESSAGE',
          protocol: 'TCP/IP',
          direction: 'OUTBOUND',
          reference,
          host,
          port,
          messageType: message.messageType || 'UNKNOWN',
          status: 'SENT',
        });
      });
      
      socket.on('data', (data) => {
        responseData += data.toString();
        
        // Check for complete response
        if (responseData.includes('\n')) {
          const latency = Date.now() - startTime;
          socket.destroy();
          
          try {
            const response = JSON.parse(responseData.trim());
            resolve({
              success: true,
              reference,
              latency,
              response,
            });
          } catch (e) {
            resolve({
              success: true,
              reference,
              latency,
              response: responseData.trim(),
            });
          }
        }
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Response timeout'));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
    
    logTransmission({
      type: 'MESSAGE',
      protocol: 'TCP/IP',
      direction: 'OUTBOUND',
      reference,
      host,
      port,
      status: result.response?.status || 'RECEIVED',
      latency: result.latency,
    });
    
    res.json(result);
  } catch (err) {
    logTransmission({
      type: 'MESSAGE',
      protocol: 'TCP/IP',
      direction: 'OUTBOUND',
      reference,
      host,
      port,
      status: 'FAILED',
      error: err.message,
    });
    
    res.status(500).json({
      success: false,
      reference,
      error: err.message,
    });
  }
});

// Queue message for retry
apiApp.post('/api/swift/queue', validateApiKey, (req, res) => {
  const { message, retryConfig } = req.body;
  
  const queueEntry = {
    id: generateMessageId(),
    message,
    createdAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: retryConfig?.maxAttempts || CONFIG.RETRY_ATTEMPTS,
    nextRetry: new Date().toISOString(),
    status: 'QUEUED',
  };
  
  messageQueue.push(queueEntry);
  
  res.json({
    queued: true,
    queueId: queueEntry.id,
    position: messageQueue.length,
  });
});

// Get queue status
apiApp.get('/api/swift/queue', (req, res) => {
  res.json({
    queue: messageQueue.map(q => ({
      id: q.id,
      messageType: q.message?.messageType,
      createdAt: q.createdAt,
      attempts: q.attempts,
      maxAttempts: q.maxAttempts,
      status: q.status,
    })),
    total: messageQueue.length,
  });
});

// Clear queue
apiApp.delete('/api/swift/queue', (req, res) => {
  const count = messageQueue.length;
  messageQueue.length = 0;
  res.json({ cleared: count });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWIFT MESSAGE SIMULATOR (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

// Simulate receiving a SWIFT message
apiApp.post('/api/swift/simulate/receive', (req, res) => {
  const { messageType, senderBic, receiverBic, amount, currency } = req.body;
  
  const simulatedMessage = {
    messageType: messageType || 'MT103',
    senderBic: senderBic || 'DEUTDEFFXXX',
    receiverBic: receiverBic || 'DCBKAEADXXX',
    amount: amount || 500000,
    currency: currency || 'USD',
    reference: generateTransactionRef(),
    uetr: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderingCustomer: 'DEUTSCHE BANK AG',
    beneficiaryName: 'DIGITAL COMMERCIAL BANK LTD',
    remittance: 'SIMULATED SWIFT TRANSFER',
  };
  
  const reference = generateTransactionRef();
  
  logTransmission({
    type: 'MESSAGE',
    protocol: 'SIMULATION',
    direction: 'INBOUND',
    messageType: simulatedMessage.messageType,
    reference,
    senderBic: simulatedMessage.senderBic,
    receiverBic: simulatedMessage.receiverBic,
    amount: simulatedMessage.amount,
    currency: simulatedMessage.currency,
    status: 'ACK',
  });
  
  res.json({
    received: true,
    message: simulatedMessage,
    ack: createAckResponse(reference, simulatedMessage),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// TLS Certificate Management
let tlsCertificates = {
  serverCert: null,
  serverKey: null,
  caCert: null,
  clientCert: null,
  lastUpdated: null,
  status: 'NOT_CONFIGURED',
  expiryDate: null,
};

apiApp.get('/api/swift/config/tls', (req, res) => {
  res.json({
    status: tlsCertificates.status,
    lastUpdated: tlsCertificates.lastUpdated,
    expiryDate: tlsCertificates.expiryDate,
    hasServerCert: !!tlsCertificates.serverCert,
    hasServerKey: !!tlsCertificates.serverKey,
    hasCaCert: !!tlsCertificates.caCert,
    hasClientCert: !!tlsCertificates.clientCert,
  });
});

apiApp.post('/api/swift/config/tls', (req, res) => {
  const { serverCert, serverKey, caCert, clientCert } = req.body;
  
  try {
    if (serverCert) tlsCertificates.serverCert = serverCert;
    if (serverKey) tlsCertificates.serverKey = serverKey;
    if (caCert) tlsCertificates.caCert = caCert;
    if (clientCert) tlsCertificates.clientCert = clientCert;
    
    tlsCertificates.lastUpdated = new Date().toISOString();
    tlsCertificates.status = (serverCert && serverKey) ? 'CONFIGURED' : 'PARTIAL';
    
    // Simulate certificate expiry calculation
    tlsCertificates.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    logTransmission({
      type: 'CONFIG',
      action: 'TLS_UPDATE',
      status: 'SUCCESS',
      details: { hasCert: !!serverCert, hasKey: !!serverKey },
    });
    
    res.json({ success: true, status: tlsCertificates.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IP Whitelist Management
let ipWhitelistConfig = {
  enabled: true,
  ips: ['127.0.0.1', '::1', '192.168.1.0/24'],
  lastUpdated: new Date().toISOString(),
};

apiApp.get('/api/swift/config/whitelist', (req, res) => {
  res.json(ipWhitelistConfig);
});

apiApp.post('/api/swift/config/whitelist', (req, res) => {
  const { enabled, ips, action, ip } = req.body;
  
  if (typeof enabled === 'boolean') {
    ipWhitelistConfig.enabled = enabled;
  }
  
  if (action === 'add' && ip) {
    if (!ipWhitelistConfig.ips.includes(ip)) {
      ipWhitelistConfig.ips.push(ip);
    }
  } else if (action === 'remove' && ip) {
    ipWhitelistConfig.ips = ipWhitelistConfig.ips.filter(i => i !== ip);
  } else if (Array.isArray(ips)) {
    ipWhitelistConfig.ips = ips;
  }
  
  ipWhitelistConfig.lastUpdated = new Date().toISOString();
  
  logTransmission({
    type: 'CONFIG',
    action: 'WHITELIST_UPDATE',
    details: { enabled: ipWhitelistConfig.enabled, count: ipWhitelistConfig.ips.length },
  });
  
  res.json({ success: true, whitelist: ipWhitelistConfig });
});

// Connection Monitoring
let monitoringConfig = {
  enabled: true,
  intervalMs: 30000,
  alertThresholds: {
    latencyMs: 5000,
    errorRate: 0.1,
    queueSize: 100,
  },
  alerts: [],
  lastCheck: null,
  uptimeStart: new Date().toISOString(),
};

let monitoringInterval = null;

function checkConnectionHealth() {
  const now = new Date();
  const stats = calculateStats();
  const alerts = [];
  
  if (stats.avgLatency > monitoringConfig.alertThresholds.latencyMs) {
    alerts.push({
      type: 'HIGH_LATENCY',
      severity: 'WARNING',
      message: `Average latency ${stats.avgLatency}ms exceeds threshold`,
      timestamp: now.toISOString(),
    });
  }
  
  if (stats.errorRate > monitoringConfig.alertThresholds.errorRate) {
    alerts.push({
      type: 'HIGH_ERROR_RATE',
      severity: 'CRITICAL',
      message: `Error rate ${(stats.errorRate * 100).toFixed(2)}% exceeds threshold`,
      timestamp: now.toISOString(),
    });
  }
  
  if (messageQueue.length > monitoringConfig.alertThresholds.queueSize) {
    alerts.push({
      type: 'QUEUE_OVERFLOW',
      severity: 'WARNING',
      message: `Queue size ${messageQueue.length} exceeds threshold`,
      timestamp: now.toISOString(),
    });
  }
  
  if (alerts.length > 0) {
    monitoringConfig.alerts = [...alerts, ...monitoringConfig.alerts].slice(0, 100);
  }
  
  monitoringConfig.lastCheck = now.toISOString();
  
  return { healthy: alerts.length === 0, alerts };
}

function calculateStats() {
  const recentLogs = transmissionLog.filter(l => 
    new Date(l.timestamp) > new Date(Date.now() - 3600000)
  );
  
  const totalMessages = recentLogs.length;
  const errors = recentLogs.filter(l => l.status === 'NACK' || l.status === 'ERROR').length;
  const latencies = recentLogs.filter(l => l.latency).map(l => l.latency);
  
  return {
    totalMessages,
    successRate: totalMessages > 0 ? ((totalMessages - errors) / totalMessages) : 1,
    errorRate: totalMessages > 0 ? (errors / totalMessages) : 0,
    avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
    minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
  };
}

apiApp.get('/api/swift/monitoring', (req, res) => {
  const health = checkConnectionHealth();
  const uptime = Date.now() - new Date(monitoringConfig.uptimeStart).getTime();
  
  res.json({
    ...monitoringConfig,
    currentHealth: health,
    uptime: {
      ms: uptime,
      formatted: formatUptime(uptime),
    },
    stats: calculateStats(),
  });
});

apiApp.post('/api/swift/monitoring', (req, res) => {
  const { enabled, intervalMs, alertThresholds } = req.body;
  
  if (typeof enabled === 'boolean') {
    monitoringConfig.enabled = enabled;
    
    if (enabled && !monitoringInterval) {
      monitoringInterval = setInterval(checkConnectionHealth, monitoringConfig.intervalMs);
    } else if (!enabled && monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  }
  
  if (intervalMs) {
    monitoringConfig.intervalMs = intervalMs;
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = setInterval(checkConnectionHealth, intervalMs);
    }
  }
  
  if (alertThresholds) {
    monitoringConfig.alertThresholds = { ...monitoringConfig.alertThresholds, ...alertThresholds };
  }
  
  res.json({ success: true, config: monitoringConfig });
});

apiApp.delete('/api/swift/monitoring/alerts', (req, res) => {
  const count = monitoringConfig.alerts.length;
  monitoringConfig.alerts = [];
  res.json({ cleared: count });
});

function formatUptime(ms) {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${days}d ${hours}h ${minutes}m`;
}

// Backup Connection Management
let backupConnection = {
  enabled: false,
  host: '',
  port: 5001,
  status: 'DISCONNECTED',
  lastAttempt: null,
  lastSuccess: null,
  failoverCount: 0,
  autoFailover: true,
};

apiApp.get('/api/swift/config/backup', (req, res) => {
  res.json(backupConnection);
});

apiApp.post('/api/swift/config/backup', (req, res) => {
  const { enabled, host, port, autoFailover } = req.body;
  
  if (typeof enabled === 'boolean') backupConnection.enabled = enabled;
  if (host) backupConnection.host = host;
  if (port) backupConnection.port = port;
  if (typeof autoFailover === 'boolean') backupConnection.autoFailover = autoFailover;
  
  logTransmission({
    type: 'CONFIG',
    action: 'BACKUP_UPDATE',
    details: { enabled: backupConnection.enabled, host: backupConnection.host },
  });
  
  res.json({ success: true, backup: backupConnection });
});

apiApp.post('/api/swift/config/backup/test', (req, res) => {
  backupConnection.lastAttempt = new Date().toISOString();
  
  // Simulate backup connection test
  const success = backupConnection.host && backupConnection.port;
  
  if (success) {
    backupConnection.status = 'CONNECTED';
    backupConnection.lastSuccess = new Date().toISOString();
  } else {
    backupConnection.status = 'ERROR';
  }
  
  res.json({
    success,
    status: backupConnection.status,
    message: success ? 'Backup connection test successful' : 'Backup connection test failed - check configuration',
  });
});

// Encryption Configuration (AES-256-GCM)
let encryptionConfig = {
  enabled: true,
  algorithm: 'AES-256-GCM',
  keyRotationDays: 90,
  lastKeyRotation: new Date().toISOString(),
  nextKeyRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
};

function encryptMessage(plaintext) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
    keyId: crypto.randomBytes(8).toString('hex'),
  };
}

function decryptMessage(encrypted, iv, authTag, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

apiApp.get('/api/swift/config/encryption', (req, res) => {
  res.json(encryptionConfig);
});

apiApp.post('/api/swift/config/encryption', (req, res) => {
  const { enabled, keyRotationDays } = req.body;
  
  if (typeof enabled === 'boolean') encryptionConfig.enabled = enabled;
  if (keyRotationDays) {
    encryptionConfig.keyRotationDays = keyRotationDays;
    encryptionConfig.nextKeyRotation = new Date(
      Date.now() + keyRotationDays * 24 * 60 * 60 * 1000
    ).toISOString();
  }
  
  res.json({ success: true, config: encryptionConfig });
});

apiApp.post('/api/swift/config/encryption/rotate', (req, res) => {
  encryptionConfig.lastKeyRotation = new Date().toISOString();
  encryptionConfig.nextKeyRotation = new Date(
    Date.now() + encryptionConfig.keyRotationDays * 24 * 60 * 60 * 1000
  ).toISOString();
  
  logTransmission({
    type: 'SECURITY',
    action: 'KEY_ROTATION',
    status: 'SUCCESS',
  });
  
  res.json({
    success: true,
    message: 'Encryption keys rotated successfully',
    lastRotation: encryptionConfig.lastKeyRotation,
    nextRotation: encryptionConfig.nextKeyRotation,
  });
});

// SFTP SSH Key Authentication
let sftpConfig = {
  host: 'sftp.swift.com',
  port: 22,
  username: 'swift_user',
  authMethod: 'password', // 'password' or 'privateKey'
  privateKey: null,
  passphrase: null,
  knownHosts: [],
  lastConnection: null,
  status: 'DISCONNECTED',
};

apiApp.get('/api/swift/config/sftp', (req, res) => {
  res.json({
    ...sftpConfig,
    privateKey: sftpConfig.privateKey ? '***CONFIGURED***' : null,
    passphrase: sftpConfig.passphrase ? '***SET***' : null,
  });
});

apiApp.post('/api/swift/config/sftp', (req, res) => {
  const { host, port, username, authMethod, privateKey, passphrase, knownHosts } = req.body;
  
  if (host) sftpConfig.host = host;
  if (port) sftpConfig.port = port;
  if (username) sftpConfig.username = username;
  if (authMethod) sftpConfig.authMethod = authMethod;
  if (privateKey) sftpConfig.privateKey = privateKey;
  if (passphrase) sftpConfig.passphrase = passphrase;
  if (knownHosts) sftpConfig.knownHosts = knownHosts;
  
  logTransmission({
    type: 'CONFIG',
    action: 'SFTP_UPDATE',
    details: { host: sftpConfig.host, authMethod: sftpConfig.authMethod },
  });
  
  res.json({
    success: true,
    config: {
      ...sftpConfig,
      privateKey: sftpConfig.privateKey ? '***CONFIGURED***' : null,
      passphrase: sftpConfig.passphrase ? '***SET***' : null,
    },
  });
});

apiApp.post('/api/swift/config/sftp/test', (req, res) => {
  sftpConfig.lastConnection = new Date().toISOString();
  
  // Simulate SFTP connection test
  const success = sftpConfig.host && sftpConfig.username;
  sftpConfig.status = success ? 'CONNECTED' : 'ERROR';
  
  res.json({
    success,
    status: sftpConfig.status,
    message: success ? 'SFTP connection test successful' : 'SFTP connection failed - check configuration',
  });
});

// Comprehensive Statistics
apiApp.get('/api/swift/stats/detailed', (req, res) => {
  const { period = '24h' } = req.query;
  
  let periodMs;
  switch (period) {
    case '1h': periodMs = 3600000; break;
    case '24h': periodMs = 86400000; break;
    case '7d': periodMs = 604800000; break;
    case '30d': periodMs = 2592000000; break;
    default: periodMs = 86400000;
  }
  
  const cutoff = new Date(Date.now() - periodMs);
  const periodLogs = transmissionLog.filter(l => new Date(l.timestamp) > cutoff);
  
  // Message type breakdown
  const byMessageType = {};
  periodLogs.forEach(l => {
    const type = l.messageType || 'UNKNOWN';
    if (!byMessageType[type]) {
      byMessageType[type] = { total: 0, success: 0, failed: 0, avgLatency: 0, latencies: [] };
    }
    byMessageType[type].total++;
    if (l.status === 'ACK' || l.status === 'SUCCESS') {
      byMessageType[type].success++;
    } else {
      byMessageType[type].failed++;
    }
    if (l.latency) {
      byMessageType[type].latencies.push(l.latency);
    }
  });
  
  // Calculate averages
  Object.keys(byMessageType).forEach(type => {
    const latencies = byMessageType[type].latencies;
    byMessageType[type].avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    delete byMessageType[type].latencies;
  });
  
  // Protocol breakdown
  const byProtocol = {};
  periodLogs.forEach(l => {
    const protocol = l.protocol || 'UNKNOWN';
    if (!byProtocol[protocol]) {
      byProtocol[protocol] = { total: 0, success: 0, failed: 0 };
    }
    byProtocol[protocol].total++;
    if (l.status === 'ACK' || l.status === 'SUCCESS') {
      byProtocol[protocol].success++;
    } else {
      byProtocol[protocol].failed++;
    }
  });
  
  // Direction breakdown
  const byDirection = { INBOUND: 0, OUTBOUND: 0 };
  periodLogs.forEach(l => {
    if (l.direction === 'INBOUND') byDirection.INBOUND++;
    else if (l.direction === 'OUTBOUND') byDirection.OUTBOUND++;
  });
  
  // Hourly distribution
  const hourlyDistribution = {};
  periodLogs.forEach(l => {
    const hour = new Date(l.timestamp).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });
  
  // Volume by currency
  const byCurrency = {};
  periodLogs.forEach(l => {
    if (l.currency && l.amount) {
      if (!byCurrency[l.currency]) {
        byCurrency[l.currency] = { count: 0, totalAmount: 0 };
      }
      byCurrency[l.currency].count++;
      byCurrency[l.currency].totalAmount += parseFloat(l.amount) || 0;
    }
  });
  
  res.json({
    period,
    periodStart: cutoff.toISOString(),
    periodEnd: new Date().toISOString(),
    summary: {
      totalTransmissions: periodLogs.length,
      successful: periodLogs.filter(l => l.status === 'ACK' || l.status === 'SUCCESS').length,
      failed: periodLogs.filter(l => l.status === 'NACK' || l.status === 'ERROR').length,
      pending: messageQueue.length,
      activeConnections: connections.size,
    },
    byMessageType,
    byProtocol,
    byDirection,
    byCurrency,
    hourlyDistribution,
    systemHealth: {
      uptime: formatUptime(Date.now() - new Date(monitoringConfig.uptimeStart).getTime()),
      tlsStatus: tlsCertificates.status,
      backupStatus: backupConnection.status,
      encryptionEnabled: encryptionConfig.enabled,
      monitoringEnabled: monitoringConfig.enabled,
      alertCount: monitoringConfig.alerts.length,
    },
  });
});

// Report Generation
apiApp.post('/api/swift/reports/generate', (req, res) => {
  const { type, period, format } = req.body;
  
  const reportId = `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  
  // Simulate report generation
  const report = {
    id: reportId,
    type: type || 'TRANSMISSION_SUMMARY',
    period: period || '24h',
    format: format || 'JSON',
    generatedAt: new Date().toISOString(),
    generatedBy: 'SYSTEM',
    status: 'COMPLETED',
    data: {
      totalTransmissions: transmissionLog.length,
      successRate: calculateStats().successRate,
      avgLatency: calculateStats().avgLatency,
      topMessageTypes: ['MT103', 'MT202', 'pacs.008'],
      recommendations: [
        'Consider enabling backup connection for high availability',
        'TLS certificates should be rotated within 30 days',
        'Queue processing is within normal parameters',
      ],
    },
  };
  
  logTransmission({
    type: 'REPORT',
    action: 'GENERATED',
    reportId,
    reportType: type,
  });
  
  res.json(report);
});

// Message Validation
apiApp.post('/api/swift/validate', (req, res) => {
  const { message, messageType } = req.body;
  
  const validationResult = {
    valid: true,
    errors: [],
    warnings: [],
    messageType: messageType || 'UNKNOWN',
    validatedAt: new Date().toISOString(),
  };
  
  // Basic validation rules
  if (!message) {
    validationResult.valid = false;
    validationResult.errors.push({ field: 'message', error: 'Message content is required' });
  }
  
  if (messageType === 'MT103') {
    if (!message?.senderBic) {
      validationResult.errors.push({ field: 'senderBic', error: 'Sender BIC is required for MT103' });
      validationResult.valid = false;
    } else if (message.senderBic.length !== 11) {
      validationResult.warnings.push({ field: 'senderBic', warning: 'BIC should be 11 characters' });
    }
    
    if (!message?.receiverBic) {
      validationResult.errors.push({ field: 'receiverBic', error: 'Receiver BIC is required for MT103' });
      validationResult.valid = false;
    }
    
    if (!message?.amount || message.amount <= 0) {
      validationResult.errors.push({ field: 'amount', error: 'Valid amount is required' });
      validationResult.valid = false;
    }
    
    if (!message?.currency) {
      validationResult.warnings.push({ field: 'currency', warning: 'Currency not specified, defaulting to USD' });
    }
  }
  
  if (messageType === 'pacs.008') {
    if (!message?.msgId) {
      validationResult.errors.push({ field: 'msgId', error: 'Message ID is required for pacs.008' });
      validationResult.valid = false;
    }
    
    if (!message?.creDtTm) {
      validationResult.warnings.push({ field: 'creDtTm', warning: 'Creation DateTime not specified' });
    }
  }
  
  res.json(validationResult);
});

// Retry Queue Management
apiApp.get('/api/swift/retry-queue', (req, res) => {
  const retryItems = messageQueue.filter(m => m.attempts > 0);
  
  res.json({
    items: retryItems,
    total: retryItems.length,
    config: {
      maxAttempts: CONFIG.RETRY_ATTEMPTS,
      intervals: CONFIG.RETRY_INTERVALS,
    },
  });
});

apiApp.post('/api/swift/retry-queue/:id/retry', (req, res) => {
  const { id } = req.params;
  const item = messageQueue.find(m => m.id === id);
  
  if (!item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  item.attempts++;
  item.nextRetry = new Date().toISOString();
  item.status = 'RETRYING';
  
  // Simulate retry
  setTimeout(() => {
    item.status = Math.random() > 0.3 ? 'SUCCESS' : 'FAILED';
    if (item.status === 'SUCCESS') {
      const index = messageQueue.indexOf(item);
      if (index > -1) messageQueue.splice(index, 1);
    }
  }, 1000);
  
  res.json({ success: true, item });
});

apiApp.delete('/api/swift/retry-queue/:id', (req, res) => {
  const { id } = req.params;
  const index = messageQueue.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  const removed = messageQueue.splice(index, 1)[0];
  res.json({ success: true, removed });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVERS
// ═══════════════════════════════════════════════════════════════════════════════

function startServers() {
  // Start monitoring if enabled
  if (monitoringConfig.enabled) {
    monitoringInterval = setInterval(checkConnectionHealth, monitoringConfig.intervalMs);
  }
  // Start TCP server
  tcpServer.listen(CONFIG.TCP_PORT, '0.0.0.0', () => {
    console.log(`[TCP] SWIFT TCP Server listening on port ${CONFIG.TCP_PORT}`);
  });
  
  // Start API server
  apiApp.listen(CONFIG.API_PORT, '0.0.0.0', () => {
    console.log(`[API] SWIFT REST API Server listening on port ${CONFIG.API_PORT}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SWIFT TCP/IP, API & SFTP Server Started');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  TCP Server:  tcp://localhost:${CONFIG.TCP_PORT}`);
  console.log(`  REST API:    http://localhost:${CONFIG.API_PORT}`);
  console.log(`  Log Dir:     ${CONFIG.LOG_DIR}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down...');
  tcpServer.close();
  process.exit(0);
});

// Export for use as module or run directly
if (require.main === module) {
  startServers();
}

module.exports = {
  tcpServer,
  apiApp,
  startServers,
  CONFIG,
  connections,
  transmissionLog,
  messageQueue,
};

