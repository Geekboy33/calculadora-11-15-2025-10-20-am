// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY CERTIFICATION PLATFORM - API CLIENT
// Cliente HTTP para comunicación con DCB Treasury API y LEMX Minting Platform
// Soporta desarrollo (localhost) y producción (luxliqdaes.cloud)
// ═══════════════════════════════════════════════════════════════════════════════

import { API_CONFIG, CONFIG } from './api-config';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  timestamp?: string;
  requestId?: string;
}

export interface LockData {
  id?: string;
  lockId: string;
  authorizationCode?: string;
  timestamp: string;
  status?: string;
  lockDetails: {
    amount: string;
    currency: string;
    beneficiary: string;
    custodyVault: string;
    expiry: string;
  };
  bankInfo: {
    bankId: string;
    bankName: string;
    signerAddress: string;
  };
  sourceOfFunds: {
    accountId: string;
    accountName: string;
    accountType: 'blockchain' | 'banking';
    originalBalance: string;
  };
  signatures: {
    role: string;
    address: string;
    hash: string;
    timestamp: string;
  }[];
  blockchain: {
    txHash?: string;
    blockNumber?: number;
    chainId: number;
    network: string;
  };
  isoData?: {
    messageId?: string;
    uetr?: string;
    isoHash?: string;
  };
  certificationNumber?: string;
  dcbTreasuryRef?: string;
  receivedAt?: string;
  authorizedAt?: string;
  authorizedBy?: string;
  mintTxHash?: string;
  lusdContractAddress?: string;
}

export interface MintRequest {
  id: string;
  authorizationCode: string;
  lockId: string;
  requestedAmount: string;
  tokenSymbol: string;
  beneficiary: string;
  status: 'pending_authorization' | 'pending' | 'approved' | 'rejected' | 'minted' | 'completed';
  createdAt: string;
  expiresAt: string;
  mintTxHash?: string;
  publicationCode?: string;
  lusdContractAddress?: string;
  mintedAt?: string;
  mintedBy?: string;
}

export interface CompletedMint {
  id: string;
  authorizationCode: string;
  publicationCode: string;
  txHash: string;
  blockNumber: number;
  mintedAmount: string;
  mintedBy: string;
  mintedAt: string;
  lusdContractAddress: string;
  lockId: string;
  beneficiary: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
  source: string;
  receivedAt?: string;
  signature?: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret?: string;
  permissions: string[];
  rateLimit: number;
  active: boolean;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DCB API CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class DCBApiClient {
  private baseUrl: string;
  private lemxUrl: string;
  private timeout: number;
  private apiKey: string | null = null;

  constructor() {
    this.baseUrl = API_CONFIG.DCB_TREASURY_URL;
    this.lemxUrl = API_CONFIG.LEMX_PLATFORM_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    
    console.log(`🔗 DCB API Client initialized`);
    console.log(`   Environment: ${CONFIG.ENV}`);
    console.log(`   DCB API: ${this.baseUrl}`);
    console.log(`   LEMX API: ${this.lemxUrl}`);
    console.log(`   Production: https://luxliqdaes.cloud`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.apiKey) {
      (headers as Record<string, string>)['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  clearApiKey(): void {
    this.apiKey = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH & INFO
  // ═══════════════════════════════════════════════════════════════════════════════

  async checkHealth(): Promise<{ dcb: boolean; lemx: boolean }> {
    const results = { dcb: false, lemx: false };
    
    try {
      const dcbResponse = await this.fetchWithTimeout(`${this.baseUrl}/api/health`);
      results.dcb = dcbResponse.ok;
    } catch (e) {
      console.error('DCB API not available:', e);
    }

    try {
      const lemxResponse = await this.fetchWithTimeout(`${this.lemxUrl}/api/health`);
      results.lemx = lemxResponse.ok;
    } catch (e) {
      console.error('LEMX API not available:', e);
    }

    return results;
  }

  async getInfo(): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/info`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get API info:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOCKS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  async createLock(lockData: Partial<LockData>): Promise<ApiResponse<LockData>> {
    const url = `${this.baseUrl}/api/locks`;
    console.log('%c📤 DCB API Client: createLock()', 'color: #00ffff; font-weight: bold;');
    console.log('   URL:', url);
    console.log('   Data:', lockData);
    
    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        body: JSON.stringify(lockData)
      });
      const result = await response.json();
      console.log('%c📬 DCB API Response:', 'color: #00ff00;', result);
      return result;
    } catch (error: any) {
      console.error('%c❌ DCB API createLock FAILED:', 'color: #ff0000; font-weight: bold;', error);
      return { success: false, error: error.message };
    }
  }

  async getLocks(status?: string): Promise<ApiResponse<LockData[]>> {
    try {
      const url = status 
        ? `${this.baseUrl}/api/locks?status=${status}`
        : `${this.baseUrl}/api/locks`;
      const response = await this.fetchWithTimeout(url);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get locks:', error);
      return { success: false, error: error.message };
    }
  }

  async getLockById(lockId: string): Promise<ApiResponse<LockData>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/locks/${lockId}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get lock:', error);
      return { success: false, error: error.message };
    }
  }

  async getLockByAuthCode(authCode: string): Promise<ApiResponse<LockData>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/locks/by-code/${authCode}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get lock by auth code:', error);
      return { success: false, error: error.message };
    }
  }

  async completeLockMinting(
    lockId: string, 
    txHash: string, 
    lusdContractAddress?: string
  ): Promise<ApiResponse<LockData>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/locks/${lockId}/complete-minting`, {
        method: 'PATCH',
        body: JSON.stringify({
          txHash,
          lusdContractAddress: lusdContractAddress || CONFIG.LEMON_CHAIN.lusdContract
        })
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to complete lock minting:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MINT REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  async getMintRequests(status?: string): Promise<ApiResponse<MintRequest[]>> {
    try {
      const url = status 
        ? `${this.baseUrl}/api/mint-requests?status=${status}`
        : `${this.baseUrl}/api/mint-requests`;
      const response = await this.fetchWithTimeout(url);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get mint requests:', error);
      return { success: false, error: error.message };
    }
  }

  async getMintRequestByCode(code: string): Promise<ApiResponse<MintRequest>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/mint-requests/by-code/${code}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get mint request:', error);
      return { success: false, error: error.message };
    }
  }

  async validateAuthorizationCode(code: string): Promise<ApiResponse<MintRequest>> {
    // First try DCB API
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/mint-requests/by-code/${code}`);
      const result = await response.json();
      if (result.success) return result;
    } catch (e) {
      console.log('DCB API validation failed, trying LEMX');
    }

    // Then try LEMX API
    try {
      const response = await this.fetchWithTimeout(`${this.lemxUrl}/api/mint-requests/by-code/${code}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to validate authorization code:', error);
      return { success: false, error: error.message };
    }
  }

  async completeMintRequest(
    requestId: string,
    txHash: string,
    lusdContractAddress?: string
  ): Promise<ApiResponse<MintRequest>> {
    try {
      const response = await this.fetchWithTimeout(`${this.lemxUrl}/api/mint-requests/${requestId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          txHash,
          lusdContractAddress: lusdContractAddress || CONFIG.LEMON_CHAIN.lusdContract,
          mintedBy: 'DCB_TREASURY'
        })
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to complete mint request:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPLETED MINTS (Explorer)
  // ═══════════════════════════════════════════════════════════════════════════════

  async getCompletedMints(): Promise<ApiResponse<CompletedMint[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/completed-mints`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get completed mints:', error);
      return { success: false, error: error.message };
    }
  }

  async getCompletedMintById(id: string): Promise<ApiResponse<CompletedMint>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/completed-mints/${id}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get completed mint:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WEBHOOKS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  async getWebhookEvents(limit: number = 50): Promise<ApiResponse<WebhookEvent[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webhooks/events?limit=${limit}`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get webhook events:', error);
      return { success: false, error: error.message };
    }
  }

  async registerWebhook(
    url: string, 
    events: string[], 
    name?: string
  ): Promise<ApiResponse<WebhookEndpoint>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webhooks/register`, {
        method: 'POST',
        body: JSON.stringify({ url, events, name })
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to register webhook:', error);
      return { success: false, error: error.message };
    }
  }

  async getRegisteredWebhooks(): Promise<ApiResponse<WebhookEndpoint[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webhooks`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get webhooks:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webhooks/${webhookId}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to delete webhook:', error);
      return { success: false, error: error.message };
    }
  }

  async testWebhook(webhookId: string): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webhooks/${webhookId}/test`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to test webhook:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // API KEYS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  async createApiKey(
    name: string, 
    permissions: string[] = ['read'],
    expiresInDays?: number
  ): Promise<ApiResponse<ApiKey>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/keys`, {
        method: 'POST',
        body: JSON.stringify({ name, permissions, expiresInDays })
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      return { success: false, error: error.message };
    }
  }

  async getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/keys`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get API keys:', error);
      return { success: false, error: error.message };
    }
  }

  async revokeApiKey(keyId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/keys/${keyId}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to revoke API key:', error);
      return { success: false, error: error.message };
    }
  }

  async rotateApiKey(keyId: string): Promise<ApiResponse<ApiKey>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/keys/${keyId}/rotate`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to rotate API key:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNC WITH LEMX
  // ═══════════════════════════════════════════════════════════════════════════════

  async syncWithLEMX(): Promise<ApiResponse<any>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/sync-with-lemx`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to sync with LEMX:', error);
      return { success: false, error: error.message };
    }
  }

  async getFullSync(): Promise<ApiResponse<any>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/sync`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get full sync:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEMX API METHODS (Direct calls to LEMX)
  // ═══════════════════════════════════════════════════════════════════════════════

  async getLEMXLocks(): Promise<ApiResponse<LockData[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.lemxUrl}/api/locks`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get LEMX locks:', error);
      return { success: false, error: error.message };
    }
  }

  async getLEMXMintRequests(): Promise<ApiResponse<MintRequest[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.lemxUrl}/api/mint-requests`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get LEMX mint requests:', error);
      return { success: false, error: error.message };
    }
  }

  async getLEMXCompletedMints(): Promise<ApiResponse<CompletedMint[]>> {
    try {
      const response = await this.fetchWithTimeout(`${this.lemxUrl}/api/completed-mints`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to get LEMX completed mints:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      lemxUrl: this.lemxUrl,
      environment: CONFIG.ENV,
      isProduction: CONFIG.IS_PRODUCTION,
      productionUrl: 'https://luxliqdaes.cloud',
      lemonChain: CONFIG.LEMON_CHAIN,
      bank: CONFIG.BANK
    };
  }

  isProduction(): boolean {
    return CONFIG.IS_PRODUCTION;
  }

  getEnvironment(): string {
    return CONFIG.ENV;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET CONNECTION FOR REAL-TIME UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

type EventCallback = (event: WebhookEvent) => void;

class DCBWebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string = 'ws://localhost:4012';
  private listeners: EventCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;

  constructor() {
    console.log('%c🔧 DCBWebSocketClient constructor called', 'color: #ff00ff; font-weight: bold; font-size: 16px');
    // Delay connection to ensure DOM is ready
    if (typeof window !== 'undefined') {
      setTimeout(() => this.connect(), 500);
    }
  }

  private connect(): void {
    this.connectionAttempts++;
    try {
      console.log('%c🔌 DCB Treasury connecting to WebSocket at ' + this.wsUrl + ' (attempt ' + this.connectionAttempts + ')', 'color: #00ffff; font-weight: bold');
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('%c✅ DCB Treasury WebSocket CONNECTED to bridge server', 'color: #00ff00; font-weight: bold; font-size: 16px');
        console.log('%c   Listeners count: ' + this.listeners.length, 'color: #00ff00');
        this.isConnected = true;
        this.connectionAttempts = 0;
        
        // Mostrar alerta visual para confirmar conexión
        console.log('%c🎯 WEBSOCKET READY TO RECEIVE LEMX NOTIFICATIONS', 'color: #ffff00; font-weight: bold; font-size: 18px; background: #333; padding: 10px');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // LOG MUY VISIBLE
          console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-weight: bold; font-size: 14px');
          console.log('%c║  📨 DCB WEBSOCKET - MESSAGE RECEIVED FROM LEMX MINTING          ║', 'color: #00ff00; font-weight: bold; font-size: 14px');
          console.log('%c╠══════════════════════════════════════════════════════════════════╣', 'color: #00ff00; font-weight: bold; font-size: 14px');
          console.log('%c║  Type: ' + data.type.padEnd(55) + '║', 'color: #ffff00; font-weight: bold');
          console.log('%c║  Listeners to notify: ' + String(this.listeners.length).padEnd(42) + '║', 'color: #ff00ff; font-weight: bold');
          console.log('%c║  Data: ' + JSON.stringify(data).substring(0, 55).padEnd(55) + '║', 'color: #ffffff');
          console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-weight: bold; font-size: 14px');
          
          this.handleMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('%c🔌 DCB Treasury WebSocket DISCONNECTED, reconnecting in 5s...', 'color: #ff6600; font-weight: bold');
        this.isConnected = false;
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error('%c❌ DCB Treasury WebSocket ERROR:', 'color: #ff0000; font-weight: bold', error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  private handleMessage(data: any): void {
    console.log('%c══════════════════════════════════════════════════════════════════', 'color: #00ffff; font-weight: bold');
    console.log('%c📩 DCB WEBSOCKET - PROCESSING MESSAGE', 'color: #00ffff; font-weight: bold; font-size: 14px');
    console.log('   Type:', data.type);
    console.log('   Full data:', JSON.stringify(data, null, 2).substring(0, 500));
    console.log('   Listeners count:', this.listeners.length);
    console.log('%c══════════════════════════════════════════════════════════════════', 'color: #00ffff; font-weight: bold');
    
    // Skip initial_state messages for notification handling
    if (data.type === 'initial_state') {
      console.log('📦 Initial state received, skipping notification...');
      return;
    }
    
    // Handle different event types
    if (data.type === 'lock.approved') {
      console.log('%c🔓 LOCK APPROVED NOTIFICATION RECEIVED!', 'color: #00ff00; font-weight: bold; font-size: 16px; background: #003300; padding: 5px');
      console.log('   Lock ID:', data.data?.payload?.lockId);
      console.log('   Approved Amount:', data.data?.payload?.approvedAmount);
      console.log('   Remaining Amount:', data.data?.payload?.remainingAmount);
    } else if (data.type === 'lock.rejected') {
      console.log('%c❌ LOCK REJECTED NOTIFICATION RECEIVED!', 'color: #ff0000; font-weight: bold; font-size: 16px');
    } else if (data.type === 'lock.reserve.created') {
      console.log('%c📦 LOCK RESERVE CREATED!', 'color: #ffaa00; font-weight: bold; font-size: 16px');
    } else if (data.type === 'mint.completed') {
      console.log('%c🎉 MINT COMPLETED NOTIFICATION RECEIVED!', 'color: #ff00ff; font-weight: bold; font-size: 16px; background: #330033; padding: 5px');
      console.log('   Lock ID:', data.data?.payload?.lockId);
      console.log('   Amount:', data.data?.payload?.amount);
      console.log('   TX Hash:', data.data?.payload?.txHash);
    }

    // Notify all listeners - extract payload correctly
    const payload = data.data?.payload || data.data || data.payload || data;
    
    const event: WebhookEvent = {
      id: data.data?.id || `ws-${Date.now()}`,
      type: data.type,
      timestamp: new Date().toISOString(),
      payload: payload,
      source: 'lemx_platform'
    };
    
    console.log('%c📤 NOTIFYING ' + this.listeners.length + ' LISTENERS...', 'color: #ff00ff; font-weight: bold; font-size: 14px');
    console.log('   Event payload being sent:', JSON.stringify(event.payload).substring(0, 300));
    
    this.listeners.forEach((callback, index) => {
      try {
        console.log(`   📞 Calling listener ${index + 1}...`);
        callback(event);
        console.log(`   ✅ Listener ${index + 1} called successfully`);
      } catch (e) {
        console.error(`   ❌ Error in listener ${index + 1}:`, e);
      }
    });
    console.log('%c══════════════════════════════════════════════════════════════════', 'color: #00ffff; font-weight: bold');
  }

  subscribe(callback: EventCallback): () => void {
    console.log('%c📝 DCB WebSocket: New subscriber added. Total listeners: ' + (this.listeners.length + 1), 'color: #ff00ff; font-weight: bold; font-size: 14px');
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
      console.log('📝 DCB WebSocket: Subscriber removed. Total listeners:', this.listeners.length);
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
  
  getListenersCount(): number {
    return this.listeners.length;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
  
  // Force reconnect (useful for debugging)
  forceReconnect(): void {
    console.log('%c🔄 Force reconnecting WebSocket...', 'color: #ffaa00; font-weight: bold');
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }
  
  // Send lock via WebSocket
  sendLock(lockData: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('%c📤 Sending lock via WebSocket...', 'color: #00ffff; font-weight: bold;');
      this.ws.send(JSON.stringify({
        type: 'lock.create',
        data: lockData
      }));
      return true;
    }
    console.log('%c⚠️ WebSocket not connected, cannot send lock', 'color: #ffaa00;');
    return false;
  }
  
  // Send lock via HTTP (more reliable)
  async sendLockHTTP(lockData: any): Promise<{success: boolean; data?: any; error?: string}> {
    console.log('%c📤 Sending lock via HTTP to http://localhost:4010/api/locks...', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    
    try {
      const response = await fetch('http://localhost:4010/api/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('%c✅ Lock sent successfully via HTTP!', 'color: #00ff00; font-weight: bold; font-size: 16px;', result);
        return { success: true, data: result.data };
      } else {
        console.log('%c❌ HTTP Error:', 'color: #ff0000;', response.status, result);
        return { success: false, error: result.error || `HTTP ${response.status}` };
      }
    } catch (err: any) {
      console.log('%c❌ Fetch Error:', 'color: #ff0000;', err.message);
      return { success: false, error: err.message };
    }
  }
}

// Singleton para evitar múltiples instancias con HMR
let dcbWebSocketInstance: DCBWebSocketClient | null = null;

function getDCBWebSocket(): DCBWebSocketClient {
  if (!dcbWebSocketInstance) {
    dcbWebSocketInstance = new DCBWebSocketClient();
  }
  return dcbWebSocketInstance;
}

// Handle HMR to prevent multiple instances
if (typeof window !== 'undefined') {
  const win = window as any;
  if (win.__dcbWebSocketInstance) {
    dcbWebSocketInstance = win.__dcbWebSocketInstance;
    console.log('%c🔄 HMR: Reusing existing WebSocket instance with ' + dcbWebSocketInstance?.getListenersCount() + ' listeners', 'color: #ffaa00; font-weight: bold');
  }
}

// Export singleton instances
export const dcbApiClient = new DCBApiClient();
export const dcbWebSocket = getDCBWebSocket();

// Store in window for HMR
if (typeof window !== 'undefined') {
  (window as any).__dcbWebSocketInstance = dcbWebSocket;
}

// Export class for custom instances
export { DCBApiClient, DCBWebSocketClient };
