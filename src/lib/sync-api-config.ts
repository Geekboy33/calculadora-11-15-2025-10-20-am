// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY - SYNC API CONFIGURATION
// Configuration for synchronization between DCB Treasury and LEMX Minting Platform
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncConfig {
  dcbTreasury: {
    baseUrl: string;
    apiKey: string;
    apiSecret: string;
    apiKeyId: string;
  };
  lemxMinting: {
    baseUrl: string;
    webhookUrl: string;
    webhookId: string;
    webhookSecret: string;
  };
  production: {
    dcbUrl: string;
    lemxUrl: string;
  };
}

// Default configuration - can be overridden
export const SYNC_CONFIG: SyncConfig = {
  dcbTreasury: {
    baseUrl: 'http://localhost:4010/api',
    apiKey: 'dcb_ded8b4116f9bbea4fa95162af14da8cdd0bf41a9c0187d53',
    apiSecret: 'dcbs_a66b108a4dd103575af56f590075faa4c636b9261cc19575cac8488acbd5ef80',
    apiKeyId: 'MKGWYD3K-140446EB'
  },
  lemxMinting: {
    baseUrl: 'http://localhost:4011/api',
    webhookUrl: 'http://localhost:4011/api/webhooks/receive',
    webhookId: 'MKGWYD3Q-B10FDB69',
    webhookSecret: 'whsec_ffc9b6d8293a879f67ac3c0f2cb23a9af83fb7fb87af3ebd'
  },
  production: {
    dcbUrl: 'https://luxliqdaes.cloud/api',
    lemxUrl: 'https://luxliqdaes.cloud/api/lemx'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface Lock {
  id: string;
  lockId: string;
  timestamp: string;
  status: string;
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
    accountType: string;
    originalBalance: string;
  };
  signatures?: any[];
  blockchain?: {
    chainId: number;
    network: string;
    txHash?: string;
    blockNumber?: number;
  };
  isoData?: {
    messageId: string;
    uetr: string;
  };
  authorizationCode?: string;
  authorizedAt?: string;
  authorizedBy?: string;
}

export interface MintRequest {
  id: string;
  lockId: string;
  authorizationCode: string;
  amount: string;
  status: string;
  createdAt: string;
  txHash?: string;
  lusdContractAddress?: string;
  completedAt?: string;
}

export interface SyncData {
  locks: Lock[];
  mintRequests: MintRequest[];
  completedMints: any[];
  webhookEvents: any[];
  lastUpdated: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class SyncApiClient {
  private config: SyncConfig;
  private isProduction: boolean;

  constructor(config: SyncConfig = SYNC_CONFIG) {
    this.config = config;
    this.isProduction = typeof window !== 'undefined' 
      ? window.location.hostname !== 'localhost' 
      : process.env.NODE_ENV === 'production';
  }

  private getDcbUrl(): string {
    return this.isProduction ? this.config.production.dcbUrl : this.config.dcbTreasury.baseUrl;
  }

  private getLemxUrl(): string {
    return this.isProduction ? this.config.production.lemxUrl : this.config.lemxMinting.baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.dcbTreasury.apiKey,
      'X-API-Secret': this.config.dcbTreasury.apiSecret,
      'X-API-Key-ID': this.config.dcbTreasury.apiKeyId
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY API METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  async dcbHealthCheck(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.getDcbUrl()}/health`, {
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async dcbGetLocks(): Promise<ApiResponse<Lock[]>> {
    try {
      const response = await fetch(`${this.getDcbUrl()}/locks`, {
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async dcbGetLock(lockId: string): Promise<ApiResponse<Lock>> {
    try {
      const response = await fetch(`${this.getDcbUrl()}/locks/${lockId}`, {
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async dcbCreateLock(lockData: Partial<Lock>): Promise<ApiResponse<Lock>> {
    try {
      const response = await fetch(`${this.getDcbUrl()}/locks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(lockData)
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async dcbGetSync(): Promise<ApiResponse<SyncData>> {
    try {
      const response = await fetch(`${this.getDcbUrl()}/sync`, {
        headers: this.getHeaders()
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEMX MINTING API METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  async lemxHealthCheck(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/health`);
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxGetLocks(): Promise<ApiResponse<Lock[]>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/locks`);
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxConsumeLock(lockId: string): Promise<ApiResponse<{ authorizationCode: string }>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/locks/${lockId}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxGetMintRequests(): Promise<ApiResponse<MintRequest[]>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/mint-requests`);
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxCompleteMint(requestId: string, txHash: string, lusdContractAddress: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/mint-requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, lusdContractAddress })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxGetCompletedMints(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/completed-mints`);
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async lemxGetSync(): Promise<ApiResponse<SyncData>> {
    try {
      const response = await fetch(`${this.getLemxUrl()}/sync`);
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BIDIRECTIONAL SYNC METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  async fullSync(): Promise<{
    dcb: ApiResponse<SyncData>;
    lemx: ApiResponse<SyncData>;
    synchronized: boolean;
  }> {
    const [dcbSync, lemxSync] = await Promise.all([
      this.dcbGetSync(),
      this.lemxGetSync()
    ]);

    return {
      dcb: dcbSync,
      lemx: lemxSync,
      synchronized: dcbSync.success && lemxSync.success
    };
  }

  async checkConnection(): Promise<{
    dcb: boolean;
    lemx: boolean;
    both: boolean;
  }> {
    const [dcbHealth, lemxHealth] = await Promise.all([
      this.dcbHealthCheck(),
      this.lemxHealthCheck()
    ]);

    return {
      dcb: dcbHealth.success,
      lemx: lemxHealth.success,
      both: dcbHealth.success && lemxHealth.success
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WEBHOOK METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  async sendWebhook(event: string, payload: any): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(this.config.lemxMinting.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DCB-Event': event,
          'X-DCB-Timestamp': new Date().toISOString(),
          'X-Webhook-ID': this.config.lemxMinting.webhookId
        },
        body: JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString()
        })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const syncApi = new SyncApiClient();

// Export class for custom configurations
export { SyncApiClient };
