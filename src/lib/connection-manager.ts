// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION CONNECTION MANAGER
// Robust connection handling for LemonChain and API services
// Ensures platforms are ALWAYS connected in production
// ═══════════════════════════════════════════════════════════════════════════════

import { ethers } from 'ethers';
import { LEMON_CHAIN, API_CONFIG, CONFIG } from './api-config';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONNECTION_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 10,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 30000, // 30 seconds
  RETRY_MULTIPLIER: 1.5,
  
  // Health check intervals
  HEALTH_CHECK_INTERVAL: 15000, // 15 seconds
  WEBSOCKET_PING_INTERVAL: 30000, // 30 seconds
  
  // Timeouts
  RPC_TIMEOUT: 10000, // 10 seconds
  API_TIMEOUT: 15000, // 15 seconds
  WEBSOCKET_TIMEOUT: 5000, // 5 seconds
  
  // Production endpoints (fallbacks)
  RPC_ENDPOINTS: [
    LEMON_CHAIN.rpc,
    'https://rpc.lemonchain.io',
    'https://rpc2.lemonchain.io'
  ],
  WSS_ENDPOINTS: [
    LEMON_CHAIN.wss,
    'wss://ws.lemonchain.io',
    'wss://ws2.lemonchain.io'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConnectionState {
  rpc: {
    connected: boolean;
    endpoint: string;
    latency: number;
    lastCheck: Date | null;
    errors: number;
  };
  websocket: {
    connected: boolean;
    endpoint: string;
    lastMessage: Date | null;
    reconnectAttempts: number;
  };
  api: {
    dcb: boolean;
    lemx: boolean;
    lastCheck: Date | null;
  };
  blockchain: {
    chainId: number;
    blockNumber: number;
    lastBlock: Date | null;
  };
}

type ConnectionListener = (state: ConnectionState) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ConnectionManager {
  private state: ConnectionState;
  private provider: ethers.JsonRpcProvider | null = null;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private websocket: WebSocket | null = null;
  private listeners: ConnectionListener[] = [];
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentRpcIndex = 0;
  private currentWssIndex = 0;
  private isInitialized = false;

  constructor() {
    this.state = {
      rpc: {
        connected: false,
        endpoint: '',
        latency: 0,
        lastCheck: null,
        errors: 0
      },
      websocket: {
        connected: false,
        endpoint: '',
        lastMessage: null,
        reconnectAttempts: 0
      },
      api: {
        dcb: false,
        lemx: false,
        lastCheck: null
      },
      blockchain: {
        chainId: LEMON_CHAIN.chainId,
        blockNumber: 0,
        lastBlock: null
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ConnectionManager already initialized');
      return;
    }

    console.log('🔌 ═══════════════════════════════════════════════════════════════════');
    console.log('   INITIALIZING PRODUCTION CONNECTION MANAGER');
    console.log('═══════════════════════════════════════════════════════════════════════');
    
    // Connect to all services
    await Promise.all([
      this.connectRpc(),
      this.connectWebSocket(),
      this.checkApiHealth()
    ]);

    // Start health monitoring
    this.startHealthMonitoring();
    
    this.isInitialized = true;
    
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   ✅ CONNECTION MANAGER INITIALIZED');
    this.logConnectionState();
    console.log('═══════════════════════════════════════════════════════════════════════\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RPC CONNECTION (LemonChain)
  // ═══════════════════════════════════════════════════════════════════════════

  private async connectRpc(retryCount = 0): Promise<boolean> {
    const endpoints = CONNECTION_CONFIG.RPC_ENDPOINTS;
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpointIndex = (this.currentRpcIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];
      
      try {
        console.log(`🔗 Connecting to RPC: ${endpoint}`);
        const startTime = Date.now();
        
        const provider = new ethers.JsonRpcProvider(endpoint, {
          chainId: LEMON_CHAIN.chainId,
          name: LEMON_CHAIN.name
        });
        
        // Test connection with timeout
        const network = await Promise.race([
          provider.getNetwork(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC timeout')), CONNECTION_CONFIG.RPC_TIMEOUT)
          )
        ]) as ethers.Network;
        
        const latency = Date.now() - startTime;
        const blockNumber = await provider.getBlockNumber();
        
        // Verify chain ID
        if (Number(network.chainId) !== LEMON_CHAIN.chainId) {
          console.warn(`⚠️ Wrong chain ID: expected ${LEMON_CHAIN.chainId}, got ${network.chainId}`);
          continue;
        }
        
        // Success!
        this.provider = provider;
        this.currentRpcIndex = endpointIndex;
        this.state.rpc = {
          connected: true,
          endpoint,
          latency,
          lastCheck: new Date(),
          errors: 0
        };
        this.state.blockchain = {
          chainId: Number(network.chainId),
          blockNumber,
          lastBlock: new Date()
        };
        
        console.log(`✅ RPC connected: ${endpoint} (${latency}ms, block #${blockNumber})`);
        this.notifyListeners();
        
        // Subscribe to new blocks
        this.subscribeToBlocks();
        
        return true;
      } catch (error: any) {
        console.warn(`❌ RPC failed: ${endpoint} - ${error.message}`);
      }
    }
    
    // All endpoints failed - retry with backoff
    if (retryCount < CONNECTION_CONFIG.MAX_RETRIES) {
      const delay = Math.min(
        CONNECTION_CONFIG.INITIAL_RETRY_DELAY * Math.pow(CONNECTION_CONFIG.RETRY_MULTIPLIER, retryCount),
        CONNECTION_CONFIG.MAX_RETRY_DELAY
      );
      console.log(`⏳ Retrying RPC connection in ${delay}ms (attempt ${retryCount + 1}/${CONNECTION_CONFIG.MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connectRpc(retryCount + 1);
    }
    
    this.state.rpc.connected = false;
    this.state.rpc.errors++;
    this.notifyListeners();
    console.error('❌ All RPC endpoints failed after maximum retries');
    return false;
  }

  private subscribeToBlocks(): void {
    if (!this.provider) return;
    
    this.provider.on('block', (blockNumber: number) => {
      this.state.blockchain.blockNumber = blockNumber;
      this.state.blockchain.lastBlock = new Date();
      this.notifyListeners();
    });
    
    this.provider.on('error', (error: any) => {
      console.error('❌ RPC provider error:', error.message);
      this.state.rpc.errors++;
      
      // Reconnect if too many errors
      if (this.state.rpc.errors >= 3) {
        console.log('🔄 Too many RPC errors, reconnecting...');
        this.reconnectRpc();
      }
    });
  }

  private async reconnectRpc(): Promise<void> {
    this.state.rpc.connected = false;
    this.notifyListeners();
    
    // Move to next endpoint
    this.currentRpcIndex = (this.currentRpcIndex + 1) % CONNECTION_CONFIG.RPC_ENDPOINTS.length;
    
    // Cleanup old provider
    if (this.provider) {
      this.provider.removeAllListeners();
      this.provider = null;
    }
    
    await this.connectRpc();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET CONNECTION (Bridge Server)
  // ═══════════════════════════════════════════════════════════════════════════

  private async connectWebSocket(): Promise<boolean> {
    if (typeof WebSocket === 'undefined') {
      console.warn('⚠️ WebSocket not supported in this environment');
      return false;
    }

    const wsUrl = API_CONFIG.WS_URL;
    
    try {
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      return new Promise((resolve) => {
        this.websocket = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          if (this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket connection timeout');
            this.websocket.close();
            resolve(false);
          }
        }, CONNECTION_CONFIG.WEBSOCKET_TIMEOUT);
        
        this.websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connected');
          this.state.websocket = {
            connected: true,
            endpoint: wsUrl,
            lastMessage: new Date(),
            reconnectAttempts: 0
          };
          this.notifyListeners();
          this.startWebSocketPing();
          resolve(true);
        };
        
        this.websocket.onmessage = (event) => {
          this.state.websocket.lastMessage = new Date();
          // Message handling delegated to api-bridge.ts
        };
        
        this.websocket.onclose = (event) => {
          console.log(`🔌 WebSocket closed (code: ${event.code})`);
          this.state.websocket.connected = false;
          this.notifyListeners();
          this.scheduleWebSocketReconnect();
        };
        
        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket error');
          clearTimeout(timeout);
          this.state.websocket.connected = false;
          this.notifyListeners();
          resolve(false);
        };
      });
    } catch (error: any) {
      console.error('❌ WebSocket connection failed:', error.message);
      this.state.websocket.connected = false;
      return false;
    }
  }

  private startWebSocketPing(): void {
    // Send periodic pings to keep connection alive
    setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        try {
          this.websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (e) {
          console.warn('⚠️ WebSocket ping failed');
        }
      }
    }, CONNECTION_CONFIG.WEBSOCKET_PING_INTERVAL);
  }

  private scheduleWebSocketReconnect(): void {
    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
    }
    
    const attempts = this.state.websocket.reconnectAttempts;
    if (attempts >= CONNECTION_CONFIG.MAX_RETRIES) {
      console.error('❌ Max WebSocket reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(
      CONNECTION_CONFIG.INITIAL_RETRY_DELAY * Math.pow(CONNECTION_CONFIG.RETRY_MULTIPLIER, attempts),
      CONNECTION_CONFIG.MAX_RETRY_DELAY
    );
    
    console.log(`⏳ WebSocket reconnecting in ${delay}ms (attempt ${attempts + 1}/${CONNECTION_CONFIG.MAX_RETRIES})`);
    
    this.wsReconnectTimeout = setTimeout(async () => {
      this.state.websocket.reconnectAttempts++;
      await this.connectWebSocket();
    }, delay);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  private async checkApiHealth(): Promise<void> {
    console.log('🏥 Checking API health...');
    
    const checkEndpoint = async (url: string, name: string): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONNECTION_CONFIG.API_TIMEOUT);
        
        const response = await fetch(`${url}/api/health`, {
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          console.log(`✅ ${name} API healthy`);
          return true;
        }
        console.warn(`⚠️ ${name} API returned ${response.status}`);
        return false;
      } catch (error: any) {
        console.warn(`❌ ${name} API unreachable: ${error.message}`);
        return false;
      }
    };
    
    const [dcbHealth, lemxHealth] = await Promise.all([
      checkEndpoint(API_CONFIG.DCB_TREASURY_URL, 'DCB Treasury'),
      checkEndpoint(API_CONFIG.LEMX_PLATFORM_URL, 'LEMX Minting')
    ]);
    
    this.state.api = {
      dcb: dcbHealth,
      lemx: lemxHealth,
      lastCheck: new Date()
    };
    
    this.notifyListeners();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      // Check RPC
      if (this.provider) {
        try {
          const startTime = Date.now();
          const blockNumber = await this.provider.getBlockNumber();
          this.state.rpc.latency = Date.now() - startTime;
          this.state.rpc.lastCheck = new Date();
          this.state.blockchain.blockNumber = blockNumber;
          
          // Check if blocks are progressing (stale detection)
          const timeSinceBlock = Date.now() - (this.state.blockchain.lastBlock?.getTime() || 0);
          if (timeSinceBlock > 60000) { // 60 seconds without new block
            console.warn('⚠️ No new blocks for 60 seconds, checking connection...');
            this.state.rpc.errors++;
          }
        } catch (error) {
          console.error('❌ RPC health check failed');
          this.state.rpc.errors++;
          if (this.state.rpc.errors >= 3) {
            this.reconnectRpc();
          }
        }
      }
      
      // Check WebSocket
      if (this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
        this.state.websocket.connected = false;
        this.scheduleWebSocketReconnect();
      }
      
      // Check APIs periodically
      await this.checkApiHealth();
      
      this.notifyListeners();
    }, CONNECTION_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  getState(): ConnectionState {
    return { ...this.state };
  }

  getProvider(): ethers.JsonRpcProvider | null {
    return this.provider;
  }

  getWebSocket(): WebSocket | null {
    return this.websocket;
  }

  isFullyConnected(): boolean {
    return this.state.rpc.connected && 
           this.state.websocket.connected && 
           (this.state.api.dcb || this.state.api.lemx);
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.push(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private logConnectionState(): void {
    console.log('   Connection State:');
    console.log(`     RPC: ${this.state.rpc.connected ? '✅' : '❌'} ${this.state.rpc.endpoint} (${this.state.rpc.latency}ms)`);
    console.log(`     WebSocket: ${this.state.websocket.connected ? '✅' : '❌'} ${this.state.websocket.endpoint}`);
    console.log(`     DCB API: ${this.state.api.dcb ? '✅' : '❌'}`);
    console.log(`     LEMX API: ${this.state.api.lemx ? '✅' : '❌'}`);
    console.log(`     Block: #${this.state.blockchain.blockNumber}`);
  }

  // Force reconnection of all services
  async forceReconnect(): Promise<void> {
    console.log('🔄 Force reconnecting all services...');
    
    // Reset error counts
    this.state.rpc.errors = 0;
    this.state.websocket.reconnectAttempts = 0;
    
    await Promise.all([
      this.reconnectRpc(),
      this.connectWebSocket(),
      this.checkApiHealth()
    ]);
    
    this.logConnectionState();
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.wsReconnectTimeout) {
      clearTimeout(this.wsReconnectTimeout);
    }
    if (this.provider) {
      this.provider.removeAllListeners();
    }
    if (this.websocket) {
      this.websocket.close();
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const connectionManager = new ConnectionManager();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Delay initialization to avoid blocking
  setTimeout(() => {
    connectionManager.initialize().catch(console.error);
  }, 100);
}

export default connectionManager;
