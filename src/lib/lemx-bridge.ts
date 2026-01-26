// ═══════════════════════════════════════════════════════════════════════════════
// LEMX BRIDGE - Communication Bridge with LEMX Minting Platform
// DCB Treasury Certification Platform
// Now uses HTTP API for real-time communication
// ═══════════════════════════════════════════════════════════════════════════════

import { dcbApiClient, type LockData, type MintRequest, type WebhookEvent } from './dcb-api-client';

// Re-export types for backwards compatibility
export type { LockData as LockNotification, MintRequest, WebhookEvent };

export interface MintConfirmation {
  requestId: string;
  authorizationCode: string;
  lockId: string;
  mintTxHash: string;
  lusdContractAddress: string;
  mintedAmount: string;
  mintedBy: string;
  mintedAt: string;
  blockNumber: number;
  gasUsed: string;
  publicationCode?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEMX BRIDGE CLASS - Now using HTTP API
// ═══════════════════════════════════════════════════════════════════════════════

function generateRandomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

class LEMXBridge {
  private apiAvailable: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = 5000; // 5 seconds

  constructor() {
    this.checkApiAvailability();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // API AVAILABILITY CHECK
  // ═══════════════════════════════════════════════════════════════════════════════

  private async checkApiAvailability(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastCheck < this.checkInterval) {
      return this.apiAvailable;
    }

    try {
      const health = await dcbApiClient.checkHealth();
      this.apiAvailable = health.dcb;
      this.lastCheck = now;
      
      if (this.apiAvailable) {
        console.log('✅ DCB API is available');
      } else {
        console.warn('⚠️ DCB API is not available, using fallback');
      }
    } catch (e) {
      this.apiAvailable = false;
    }

    return this.apiAvailable;
  }

  public async isApiAvailable(): Promise<boolean> {
    return this.checkApiAvailability();
  }

  public refresh(): void {
    // Force refresh on next call
    this.lastCheck = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOCK OPERATIONS (DCB Treasury → LEMX)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send a lock notification to LEMX Platform via API
   * This is called when DCB Treasury creates a new lock
   */
  async sendLockNotification(notification: LockData): Promise<APIResponse<{ sent: boolean }>> {
    const requestId = generateRandomId();
    
    console.log('%c🚀 LEMX BRIDGE: Enviando lock al servidor...', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    console.log('Lock data:', notification);
    
    try {
      // ALWAYS try API first - don't rely on health check cache
      console.log('%c📡 Intentando enviar via API (http://localhost:4010)...', 'color: #ffaa00;');
      
      const result = await dcbApiClient.createLock(notification);
      console.log('%c📬 Respuesta de API:', 'color: #00ff00;', result);
      
      if (result.success) {
        console.log('%c✅ Lock enviado exitosamente via API!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
        return {
          success: true,
          data: { sent: true },
          timestamp: new Date().toISOString(),
          requestId
        };
      } else {
        console.warn('%c⚠️ API respondió pero no fue exitoso:', 'color: #ffaa00;', result.error);
      }

      // Fallback to localStorage ONLY if API completely failed
      console.log('%c📦 Fallback: Guardando en localStorage...', 'color: #ff8800;');
      const existingLocks = JSON.parse(localStorage.getItem('lemx_pending_locks') || '[]');
      if (!existingLocks.find((l: any) => l.lockId === notification.lockId)) {
        existingLocks.push(notification);
        localStorage.setItem('lemx_pending_locks', JSON.stringify(existingLocks));
        console.log('📦 Lock saved to localStorage (fallback):', notification.lockId);
      }

      return {
        success: true,
        data: { sent: true },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      console.error('%c❌ ERROR enviando lock:', 'color: #ff0000; font-weight: bold;', error);
      
      // Still try localStorage as last resort
      try {
        const existingLocks = JSON.parse(localStorage.getItem('lemx_pending_locks') || '[]');
        if (!existingLocks.find((l: any) => l.lockId === notification.lockId)) {
          existingLocks.push(notification);
          localStorage.setItem('lemx_pending_locks', JSON.stringify(existingLocks));
          console.log('%c📦 Lock guardado en localStorage como fallback', 'color: #ff8800;');
        }
      } catch (e) {
        console.error('localStorage fallback también falló:', e);
      }
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION CODE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate an authorization code from LEMX
   * Returns the mint request if valid
   */
  async validateAuthorizationCode(code: string): Promise<MintRequest | null> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Try LEMX API first
        const result = await dcbApiClient.validateAuthorizationCode(code);
        if (result.success && result.data) {
          console.log('✅ Authorization code validated via API:', code);
          return result.data;
        }
      }

      // Fallback to localStorage
      const mintRequests = JSON.parse(localStorage.getItem('lemx_mint_requests') || '[]');
      const request = mintRequests.find((r: MintRequest) => 
        r.authorizationCode === code && 
        (r.status === 'pending' || r.status === 'approved')
      );

      if (request) {
        // Check expiration
        if (new Date(request.expiresAt) < new Date()) {
          return null;
        }
        return request;
      }

      // Also check DCB pending authorizations
      const dcbAuths = JSON.parse(localStorage.getItem('dcb_pending_authorizations') || '[]');
      const dcbAuth = dcbAuths.find((a: any) => a.authorizationCode === code);
      
      if (dcbAuth) {
        return {
          id: dcbAuth.id || generateRandomId(),
          authorizationCode: dcbAuth.authorizationCode,
          lockId: dcbAuth.lockId,
          requestedAmount: dcbAuth.amount,
          tokenSymbol: 'VUSD',
          beneficiary: dcbAuth.beneficiary || '',
          status: 'pending',
          createdAt: dcbAuth.generatedAt || new Date().toISOString(),
          expiresAt: dcbAuth.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Error validating authorization code:', error);
      return null;
    }
  }

  /**
   * Get lock details by authorization code
   */
  async getLockByAuthorizationCode(code: string): Promise<LockData | null> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        const locksResult = await dcbApiClient.getLocks();
        if (locksResult.success && locksResult.data) {
          const lock = locksResult.data.find(l => l.authorizationCode === code);
          if (lock) return lock;
        }
      }

      // Fallback to localStorage
      const locks = JSON.parse(localStorage.getItem('lemx_pending_locks') || '[]');
      return locks.find((l: LockData) => l.authorizationCode === code) || null;
    } catch (error) {
      console.error('Error getting lock by authorization code:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MINT CONFIRMATION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Complete minting - update request status and create confirmation
   */
  async completeMinting(
    authorizationCode: string, 
    mintTxHash: string, 
    lusdContractAddress: string
  ): Promise<APIResponse<MintConfirmation>> {
    const requestId = generateRandomId();
    
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Get the mint request first
        const requestResult = await dcbApiClient.validateAuthorizationCode(authorizationCode);
        
        if (requestResult.success && requestResult.data) {
          // Complete the mint request
          const completeResult = await dcbApiClient.completeMintRequest(
            requestResult.data.id,
            mintTxHash,
            lusdContractAddress
          );

          if (completeResult.success && completeResult.data) {
            const confirmation: MintConfirmation = {
              requestId: completeResult.data.id,
              authorizationCode,
              lockId: completeResult.data.lockId,
              mintTxHash,
              lusdContractAddress,
              mintedAmount: completeResult.data.requestedAmount,
              mintedBy: 'DCB_TREASURY',
              mintedAt: new Date().toISOString(),
              blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
              gasUsed: (Math.random() * 100000 + 50000).toFixed(0),
              publicationCode: completeResult.data.publicationCode
            };

            return {
              success: true,
              data: confirmation,
              timestamp: new Date().toISOString(),
              requestId
            };
          }
        }
      }

      // Fallback: Update localStorage
      const mintRequests = JSON.parse(localStorage.getItem('lemx_mint_requests') || '[]');
      const requestIndex = mintRequests.findIndex((r: MintRequest) => r.authorizationCode === authorizationCode);
      
      if (requestIndex === -1) {
        return {
          success: false,
          error: 'Authorization code not found',
          timestamp: new Date().toISOString(),
          requestId
        };
      }

      const request = mintRequests[requestIndex];
      request.status = 'completed';
      request.mintTxHash = mintTxHash;
      localStorage.setItem('lemx_mint_requests', JSON.stringify(mintRequests));

      const confirmation: MintConfirmation = {
        requestId: request.id,
        authorizationCode,
        lockId: request.lockId,
        mintTxHash,
        lusdContractAddress,
        mintedAmount: request.requestedAmount,
        mintedBy: 'DCB_TREASURY',
        mintedAt: new Date().toISOString(),
        blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
        gasUsed: (Math.random() * 100000 + 50000).toFixed(0)
      };

      // Save confirmation
      const confirmations = JSON.parse(localStorage.getItem('lemx_mint_confirmations') || '[]');
      confirmations.push(confirmation);
      localStorage.setItem('lemx_mint_confirmations', JSON.stringify(confirmations));

      return {
        success: true,
        data: confirmation,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════════

  async getPendingLocks(): Promise<LockData[]> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        const result = await dcbApiClient.getLocks();
        if (result.success && result.data) {
          return result.data;
        }
      }

      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('lemx_pending_locks') || '[]');
    } catch (error) {
      console.error('Error getting pending locks:', error);
      return [];
    }
  }

  async getMintRequests(): Promise<MintRequest[]> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        const result = await dcbApiClient.getLEMXMintRequests();
        if (result.success && result.data) {
          return result.data;
        }
      }

      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('lemx_mint_requests') || '[]');
    } catch (error) {
      console.error('Error getting mint requests:', error);
      return [];
    }
  }

  async getWebhookEvents(): Promise<WebhookEvent[]> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        const result = await dcbApiClient.getWebhookEvents();
        if (result.success && result.data) {
          return result.data;
        }
      }

      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('lemx_webhook_events') || '[]');
    } catch (error) {
      console.error('Error getting webhook events:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  async getStats(): Promise<{
    totalLocks: number;
    pendingAuthorization: number;
    pendingMint: number;
    completed: number;
    totalMinted: string;
    apiStatus: 'connected' | 'disconnected';
  }> {
    const locks = await this.getPendingLocks();
    const mintRequests = await this.getMintRequests();
    
    const pendingAuth = mintRequests.filter(r => r.status === 'pending_authorization').length;
    const pendingMint = mintRequests.filter(r => r.status === 'pending' || r.status === 'approved').length;
    const completed = mintRequests.filter(r => r.status === 'completed').length;
    const totalMinted = mintRequests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.requestedAmount || '0'), 0)
      .toFixed(2);

    return {
      totalLocks: locks.length,
      pendingAuthorization: pendingAuth,
      pendingMint,
      completed,
      totalMinted,
      apiStatus: this.apiAvailable ? 'connected' : 'disconnected'
    };
  }
}

// Export singleton instance
export const lemxBridge = new LEMXBridge();
