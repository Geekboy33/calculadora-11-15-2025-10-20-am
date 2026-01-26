// ═══════════════════════════════════════════════════════════════════════════════
// LEMX MINTING PLATFORM - API BRIDGE
// API punto a punto con DCB Treasury Certification Platform
// PRODUCTION-READY with robust connection handling
// ═══════════════════════════════════════════════════════════════════════════════

import { generateHMAC, verifyHMAC, generateRandomId, sha256 } from './crypto-utils';
import { API_CONFIG as IMPORTED_CONFIG, CONFIG } from './api-config';
import { connectionManager, ConnectionState } from './connection-manager';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Now uses dynamic config from api-config.ts
// ═══════════════════════════════════════════════════════════════════════════════

export const API_CONFIG = {
  DCB_TREASURY_URL: IMPORTED_CONFIG.DCB_TREASURY_URL,
  LEMX_PLATFORM_URL: IMPORTED_CONFIG.LEMX_PLATFORM_URL,
  WS_URL: IMPORTED_CONFIG.WS_URL,
  API_VERSION: IMPORTED_CONFIG.API_VERSION,
  TIMEOUT: IMPORTED_CONFIG.TIMEOUT,
  RETRY_ATTEMPTS: IMPORTED_CONFIG.RETRY_ATTEMPTS,
  WEBHOOK_SECRET: IMPORTED_CONFIG.WEBHOOK_SECRET
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LockNotification {
  id: string;
  lockId: string;
  authorizationCode: string;
  timestamp: string;
  
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
}

export interface MintRequest {
  id: string;
  authorizationCode: string;
  lockId: string;
  requestedAmount: string;
  tokenSymbol: string;
  beneficiary: string;
  status: 'pending' | 'approved' | 'rejected' | 'minted';
  createdAt: string;
  expiresAt: string;
}

export interface MintConfirmation {
  id: string;
  authorizationCode: string;
  publicationCode: string;
  txHash: string;
  blockNumber: number;
  mintedAmount: string;
  mintedBy: string;
  mintedAt: string;
  lusdContractAddress: string;
}

export interface WebhookEvent {
  id: string;
  type: 'lock.created' | 'lock.approved' | 'mint.requested' | 'mint.approved' | 'mint.rejected' | 'mint.completed' | 'publication.created';
  timestamp: string;
  payload: any;
  signature: string;
  source: 'dcb_treasury' | 'lemx_platform';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const PENDING_LOCKS_KEY = 'lemx_pending_locks';
const MINT_REQUESTS_KEY = 'lemx_mint_requests';
const WEBHOOK_EVENTS_KEY = 'lemx_webhook_events';
const COMPLETED_MINTS_KEY = 'lemx_completed_mints';
const REJECTED_LOCKS_KEY = 'lemx_rejected_locks';
const MINT_EXPLORER_KEY = 'lemx_mint_explorer_events';

// Mint Explorer Event Interface
export interface MintExplorerEvent {
  id: string;
  type: 'LOCK_CREATED' | 'LOCK_APPROVED' | 'LOCK_REJECTED' | 'LOCK_RESERVE_CREATED' | 'MINT_COMPLETED';
  timestamp: string;
  lockId: string;
  authorizationCode: string;
  publicationCode?: string;
  amount: string;
  description: string;
  actor: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'reserved';
  signatures?: {
    role: string;
    address: string;
    hash: string;
    timestamp: string;
    txHash?: string;
    blockNumber?: number;
  }[];
  blockchain?: {
    network: string;
    chainId: number;
    txHash?: string;
    blockNumber?: number;
    lusdContract?: string;
    lockContractHash?: string;
    lusdMintHash?: string;
  };
  details?: {
    beneficiary?: string;
    bankName?: string;
    publicationCode?: string;
    mintedBy?: string;
    mintedAt?: string;
    remainingAmount?: string;
    originalAmount?: string;
    approvedAmount?: string;
    reason?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API BRIDGE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

type EventCallback = (event: WebhookEvent) => void;

// Interface for rejected locks
export interface RejectedLock {
  lockId: string;
  authorizationCode: string;
  amount: string;
  rejectedBy: string;
  rejectedAt: string;
  reason: string;
  bankName: string;
  beneficiary?: string;
  signatures?: any[];
}

class APIBridge {
  private pendingLocks: LockNotification[] = [];
  private mintRequests: MintRequest[] = [];
  private webhookEvents: WebhookEvent[] = [];
  private completedMints: MintConfirmation[] = [];
  private rejectedLocks: RejectedLock[] = [];
  private mintExplorerEvents: MintExplorerEvent[] = [];
  private ws: WebSocket | null = null;
  private wsConnected: boolean = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: EventCallback[] = [];

  constructor() {
    // Clear localStorage to ensure fresh data from server
    this.clearLocalStorage();
    this.loadFromStorage();
    // Delay WebSocket connection to avoid blocking
    setTimeout(() => this.connectWebSocket(), 1000);
    this.startPolling();
  }

  private clearLocalStorage(): void {
    // Clear old data to force sync from server
    localStorage.removeItem(PENDING_LOCKS_KEY);
    localStorage.removeItem(MINT_REQUESTS_KEY);
    localStorage.removeItem(WEBHOOK_EVENTS_KEY);
    localStorage.removeItem(COMPLETED_MINTS_KEY);
    // NOTE: Don't clear REJECTED_LOCKS_KEY - we want to persist rejections
    console.log('🗑️ Cleared localStorage for fresh server sync (keeping rejected locks)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBSOCKET CONNECTION (Production-Ready with Exponential Backoff)
  // ═══════════════════════════════════════════════════════════════════════════

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastConnectionAttempt = 0;

  private connectWebSocket(): void {
    try {
      // Check if WebSocket is supported
      if (typeof WebSocket === 'undefined') {
        console.warn('WebSocket not supported, using polling only');
        return;
      }

      // Prevent rapid reconnection attempts
      const now = Date.now();
      if (now - this.lastConnectionAttempt < 1000) {
        console.log('⏳ Throttling WebSocket connection attempt');
        return;
      }
      this.lastConnectionAttempt = now;

      // Clear any existing connection
      if (this.ws) {
        try {
          this.ws.close();
        } catch (e) {}
        this.ws = null;
      }

      console.log(`🔌 Connecting to WebSocket: ${API_CONFIG.WS_URL} (attempt ${this.reconnectAttempts + 1})`);
      this.ws = new WebSocket(API_CONFIG.WS_URL);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ WebSocket connection timeout');
          this.ws.close();
        }
      }, 10000);
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected to bridge server');
        this.wsConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        
        // Request initial state sync
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'sync_request', timestamp: Date.now() }));
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'pong') { // Don't log pong messages
            console.log('📨 WebSocket message:', data.type);
          }
          this.handleWebSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
        this.wsConnected = false;
        this.ws = null;
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.warn('⚠️ WebSocket error, will retry...');
        this.wsConnected = false;
      };
    } catch (error) {
      console.warn('Failed to connect WebSocket:', error);
      this.wsConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached. Using polling only.');
      // Reset after 5 minutes to try again
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connectWebSocket();
      }, 300000);
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );
    
    console.log(`⏳ WebSocket reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectWebSocket();
    }, delay);
  }

  // Force reconnect (called externally)
  forceReconnect(): void {
    console.log('🔄 Force reconnecting WebSocket...');
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connectWebSocket();
  }

  private handleWebSocketMessage(data: any): void {
    console.log('🔔 WebSocket message received:', data.type);
    
    if (data.type === 'initial_state') {
      // Sync initial state from server - REPLACE local data
      console.log('📥 Syncing initial state from server...');
      if (data.data.locks) {
        // Only keep pending locks from server
        this.pendingLocks = data.data.locks.filter((l: any) => l.status === 'pending' || !l.status);
        console.log(`   Loaded ${this.pendingLocks.length} pending locks`);
      }
      if (data.data.mintRequests) {
        this.mintRequests = data.data.mintRequests;
        console.log(`   Loaded ${this.mintRequests.length} mint requests`);
      }
      if (data.data.completedMints) {
        this.completedMints = data.data.completedMints;
        console.log(`   Loaded ${this.completedMints.length} completed mints`);
      }
      this.saveToStorage();
      this.notifyListeners({ id: 'sync', type: 'lock.created', timestamp: new Date().toISOString(), payload: {}, signature: '', source: 'dcb_treasury' });
    } else if (data.type === 'lock.created') {
      const lock = data.data?.event?.payload || data.data;
      console.log('🔒 New lock received:', lock?.lockId);
      if (lock && lock.lockId && !this.pendingLocks.find(l => l.lockId === lock.lockId)) {
        this.pendingLocks.push(lock);
        this.saveToStorage();
        console.log(`   Added to pending locks. Total: ${this.pendingLocks.length}`);
        this.notifyListeners({ id: generateRandomId(), type: 'lock.created', timestamp: new Date().toISOString(), payload: lock, signature: '', source: 'dcb_treasury' });
      }
    } else if (data.type === 'lock.approved') {
      // When a lock is approved, remove it from pending or update its amount
      const approvalData = data.data?.payload || data.data;
      console.log('✅ Lock approved via WebSocket:', approvalData?.lockId);
      if (approvalData && approvalData.lockId) {
        const lockIdx = this.pendingLocks.findIndex(l => l.lockId === approvalData.lockId);
        if (lockIdx >= 0) {
          const remainingAmount = parseFloat(approvalData.remainingAmount || '0');
          console.log(`   Remaining amount: $${remainingAmount}`);
          if (remainingAmount > 0) {
            // Update the lock amount to remaining
            this.pendingLocks[lockIdx].lockDetails.amount = approvalData.remainingAmount;
            console.log(`   Updated lock amount to $${approvalData.remainingAmount}`);
          } else {
            // Remove the lock entirely
            this.pendingLocks.splice(lockIdx, 1);
            console.log('   Removed lock from pending (fully consumed)');
          }
          this.saveToStorage();
        } else {
          console.log('   Lock not found in local pending locks');
        }
        this.notifyListeners({ id: generateRandomId(), type: 'lock.approved', timestamp: new Date().toISOString(), payload: approvalData, signature: '', source: 'lemx_platform' });
      }
    } else if (data.type === 'lock.reserve.created') {
      // Lock reserve created - notify listeners
      console.log('📦 Lock reserve created:', data.data?.id);
      this.notifyListeners({ id: generateRandomId(), type: 'lock.approved', timestamp: new Date().toISOString(), payload: data.data, signature: '', source: 'lemx_platform' });
    } else if (data.type === 'mint.requested') {
      const request = data.data?.event?.payload || data.data;
      console.log('📝 Mint request received:', request?.id);
      if (request && request.id && !this.mintRequests.find(r => r.id === request.id)) {
        this.mintRequests.push(request);
        this.saveToStorage();
        this.notifyListeners({ id: generateRandomId(), type: 'mint.requested', timestamp: new Date().toISOString(), payload: request, signature: '', source: 'dcb_treasury' });
      }
    } else if (data.type === 'mint.approved' || data.type === 'mint.rejected' || data.type === 'mint.completed') {
      const request = data.data;
      console.log(`📋 Mint ${data.type}:`, request?.id);
      if (request && request.id) {
        const idx = this.mintRequests.findIndex(r => r.id === request.id);
        if (idx >= 0) {
          this.mintRequests[idx] = { ...this.mintRequests[idx], ...request };
          this.saveToStorage();
        }
        this.notifyListeners({ id: generateRandomId(), type: data.type, timestamp: new Date().toISOString(), payload: request, signature: '', source: 'lemx_platform' });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POLLING (BACKUP) - Production-Ready with Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  private pollErrorCount = 0;
  private maxPollErrors = 5;
  private pollIntervalMs = 2000;
  private isPolling = false;

  private startPolling(): void {
    // Poll every 2 seconds for more responsive updates
    this.pollInterval = setInterval(() => this.pollData(), this.pollIntervalMs);
    // Initial poll immediately
    this.pollData();
    // And again after 1 second to catch any race conditions
    setTimeout(() => this.pollData(), 1000);
  }

  private async fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  // Normalize lock data from server to match expected interface
  private normalizeLock(lock: any): LockNotification {
    return {
      id: lock.id || lock.lockId || generateRandomId(),
      lockId: lock.lockId || lock.id || '',
      authorizationCode: lock.authorizationCode || `AUTH-${Date.now()}`,
      timestamp: lock.timestamp || lock.createdAt || new Date().toISOString(),
      
      lockDetails: {
        amount: lock.lockDetails?.amount || lock.amount || '0',
        currency: lock.lockDetails?.currency || lock.currency || 'USD',
        beneficiary: lock.lockDetails?.beneficiary || lock.beneficiary || '',
        custodyVault: lock.lockDetails?.custodyVault || lock.custodyVault || '',
        expiry: lock.lockDetails?.expiry || lock.expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      
      bankInfo: {
        bankId: lock.bankInfo?.bankId || 'DCB-001',
        bankName: lock.bankInfo?.bankName || 'Digital Commercial Bank Ltd.',
        signerAddress: lock.bankInfo?.signerAddress || lock.bankInfo?.signer || ''
      },
      
      sourceOfFunds: lock.sourceOfFunds || {
        type: 'bank_transfer',
        reference: lock.lockId || '',
        verificationStatus: 'verified'
      },
      
      signatures: lock.signatures || [],
      status: lock.status || 'pending',
      dcbSignature: lock.dcbSignature || null,
      isoData: lock.isoData || null
    };
  }

  private async pollData(): Promise<void> {
    // Prevent concurrent polling
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // Fetch locks from server - REPLACE local data with server data
      console.log('%c🔄 POLLING: Fetching locks from server...', 'color: #00aaff; font-weight: bold;');
      const locksRes = await this.fetchWithTimeout(`${API_CONFIG.LEMX_PLATFORM_URL}/api/locks`);
      if (locksRes.ok) {
        const locksData = await locksRes.json();
        console.log('%c📥 POLL RESPONSE:', 'color: #00ff00; font-weight: bold;', {
          success: locksData.success,
          count: locksData.data?.length || 0,
          data: locksData.data
        });
        
        if (locksData.success && locksData.data) {
          const prevCount = this.pendingLocks.length;
          const newCount = locksData.data.length;
          
          // Normalize locks from server - handle different data structures
          const normalizedLocks = locksData.data.map((lock: any) => this.normalizeLock(lock));
          
          // Check for new locks to notify
          const newLocks = normalizedLocks.filter((l: any) => !this.pendingLocks.find(pl => pl.lockId === l.lockId));
          
          // Check for changed amounts
          const changedLocks = normalizedLocks.filter((serverLock: any) => {
            const localLock = this.pendingLocks.find(l => l.lockId === serverLock.lockId);
            return localLock && localLock.lockDetails?.amount !== serverLock.lockDetails?.amount;
          });
          
          // Replace local locks with server locks (source of truth)
          this.pendingLocks = normalizedLocks;
          this.saveToStorage();
          
          // SIEMPRE logear el estado actual
          console.log('%c📊 POLL STATUS:', 'color: #ffff00; font-weight: bold; font-size: 14px;', {
            previousLocks: prevCount,
            currentLocks: newCount,
            newLocks: newLocks.length,
            changedLocks: changedLocks.length,
            listeners: this.listeners.length
          });
          
          // Notify about new locks
          if (newLocks.length > 0 || changedLocks.length > 0) {
            console.log('%c🔔 NOTIFYING LISTENERS about new/changed locks!', 'color: #ff00ff; font-weight: bold;');
            this.notifyListeners({ id: generateRandomId(), type: 'lock.created', timestamp: new Date().toISOString(), payload: {}, signature: '', source: 'dcb_treasury' });
          }
        }
      } else {
        console.log('%c❌ POLL FAILED:', 'color: #ff0000;', locksRes.status);
      }

      // Fetch mint requests from server - REPLACE local data with server data
      const requestsRes = await this.fetchWithTimeout(`${API_CONFIG.LEMX_PLATFORM_URL}/api/mint-requests`);
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        if (requestsData.success && requestsData.data) {
          const prevCount = this.mintRequests.length;
          
          // Check for new requests to notify
          const newRequests = requestsData.data.filter((r: any) => !this.mintRequests.find(mr => mr.id === r.id));
          
          // Replace local requests with server requests (source of truth)
          this.mintRequests = requestsData.data;
          this.saveToStorage();
          
          // Log changes
          if (prevCount !== requestsData.data.length || newRequests.length > 0) {
            console.log(`📊 Poll: ${prevCount} → ${requestsData.data.length} mint requests`);
          }
          
          // Notify about new requests
          if (newRequests.length > 0) {
            this.notifyListeners({ id: generateRandomId(), type: 'mint.requested', timestamp: new Date().toISOString(), payload: {}, signature: '', source: 'dcb_treasury' });
          }
        }
      }
      
      // Fetch Mint Explorer events from server - SHARED between DCB Treasury and LEMX Minting
      const explorerRes = await this.fetchWithTimeout(`${API_CONFIG.LEMX_PLATFORM_URL}/api/mint-explorer`);
      if (explorerRes.ok) {
        const explorerData = await explorerRes.json();
        if (explorerData.success && explorerData.data) {
          const prevCount = this.mintExplorerEvents.length;
          this.mintExplorerEvents = explorerData.data;
          
          // Log changes
          if (prevCount !== explorerData.data.length) {
            console.log(`📊 Poll: ${prevCount} → ${explorerData.data.length} mint explorer events`);
          }
        }
      }

      // Reset error count on successful poll
      this.pollErrorCount = 0;
    } catch (error: any) {
      this.pollErrorCount++;
      
      if (this.pollErrorCount <= this.maxPollErrors) {
        console.warn(`⚠️ Poll error (${this.pollErrorCount}/${this.maxPollErrors}):`, error.message);
      }
      
      // If too many errors, slow down polling
      if (this.pollErrorCount >= this.maxPollErrors) {
        console.error('❌ Too many poll errors, slowing down polling interval');
        this.stopPolling();
        this.pollIntervalMs = Math.min(this.pollIntervalMs * 2, 30000); // Max 30 seconds
        setTimeout(() => {
          this.pollErrorCount = 0;
          this.startPolling();
        }, 10000);
      }
    } finally {
      this.isPolling = false;
    }
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Force sync with server - useful after approvals
  async forceSync(): Promise<void> {
    console.log('🔄 Forcing sync with server...');
    await this.pollData();
    console.log('✅ Sync complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  subscribe(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(event: WebhookEvent): void {
    this.listeners.forEach(callback => callback(event));
  }

  isConnected(): boolean {
    return this.wsConnected;
  }

  // Get detailed connection status
  getConnectionStatus(): {
    websocket: boolean;
    polling: boolean;
    lastPoll: Date | null;
    reconnectAttempts: number;
    errorCount: number;
  } {
    return {
      websocket: this.wsConnected,
      polling: this.pollInterval !== null,
      lastPoll: new Date(),
      reconnectAttempts: this.reconnectAttempts,
      errorCount: this.pollErrorCount
    };
  }

  private loadFromStorage(): void {
    try {
      const locks = localStorage.getItem(PENDING_LOCKS_KEY);
      const requests = localStorage.getItem(MINT_REQUESTS_KEY);
      const events = localStorage.getItem(WEBHOOK_EVENTS_KEY);
      const mints = localStorage.getItem(COMPLETED_MINTS_KEY);
      const rejected = localStorage.getItem(REJECTED_LOCKS_KEY);

      this.pendingLocks = locks ? JSON.parse(locks) : [];
      this.mintRequests = requests ? JSON.parse(requests) : [];
      this.webhookEvents = events ? JSON.parse(events) : [];
      this.completedMints = mints ? JSON.parse(mints) : [];
      this.rejectedLocks = rejected ? JSON.parse(rejected) : [];
      
      console.log('[APIBridge] 📂 Loaded from storage:',
        'pending:', this.pendingLocks.length,
        'requests:', this.mintRequests.length,
        'completed:', this.completedMints.length,
        'rejected:', this.rejectedLocks.length
      );
    } catch (error) {
      console.error('Error loading API bridge data:', error);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(PENDING_LOCKS_KEY, JSON.stringify(this.pendingLocks));
    localStorage.setItem(MINT_REQUESTS_KEY, JSON.stringify(this.mintRequests));
    localStorage.setItem(WEBHOOK_EVENTS_KEY, JSON.stringify(this.webhookEvents));
    localStorage.setItem(COMPLETED_MINTS_KEY, JSON.stringify(this.completedMints));
    localStorage.setItem(REJECTED_LOCKS_KEY, JSON.stringify(this.rejectedLocks));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOK HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  createWebhookSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return generateHMAC(payloadString);
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const payloadString = JSON.stringify(payload);
    return verifyHMAC(payloadString, signature);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCOMING: FROM DCB TREASURY
  // ═══════════════════════════════════════════════════════════════════════════

  receiveLockNotification(notification: LockNotification): APIResponse<{ received: boolean }> {
    const requestId = generateRandomId();
    
    try {
      // Check if lock already exists
      if (this.pendingLocks.find(l => l.lockId === notification.lockId)) {
        return {
          success: false,
          error: 'Lock notification already exists',
          timestamp: new Date().toISOString(),
          requestId
        };
      }

      // Add to pending locks
      this.pendingLocks.push(notification);

      // Create mint request
      const mintRequest: MintRequest = {
        id: generateRandomId(),
        authorizationCode: notification.authorizationCode,
        lockId: notification.lockId,
        requestedAmount: notification.lockDetails.amount,
        tokenSymbol: 'VUSD',
        beneficiary: notification.lockDetails.beneficiary,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: notification.lockDetails.expiry
      };
      this.mintRequests.push(mintRequest);

      // Log webhook event
      const event: WebhookEvent = {
        id: generateRandomId(),
        type: 'lock.created',
        timestamp: new Date().toISOString(),
        payload: notification,
        signature: this.createWebhookSignature(notification),
        source: 'dcb_treasury'
      };
      this.webhookEvents.push(event);

      this.saveToStorage();

      return {
        success: true,
        data: { received: true },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTGOING: TO DCB TREASURY
  // ═══════════════════════════════════════════════════════════════════════════

  approveMint(authorizationCode: string, approvedBy: string): APIResponse<MintRequest> {
    const requestId = generateRandomId();
    
    const request = this.mintRequests.find(r => r.authorizationCode === authorizationCode);
    if (!request) {
      return {
        success: false,
        error: 'Mint request not found',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    request.status = 'approved';
    
    // Log event
    const event: WebhookEvent = {
      id: generateRandomId(),
      type: 'mint.approved',
      timestamp: new Date().toISOString(),
      payload: { authorizationCode, approvedBy },
      signature: this.createWebhookSignature({ authorizationCode, approvedBy }),
      source: 'lemx_platform'
    };
    this.webhookEvents.push(event);

    this.saveToStorage();

    return {
      success: true,
      data: request,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  rejectMint(authorizationCode: string, reason: string, rejectedBy: string): APIResponse<MintRequest> {
    const requestId = generateRandomId();
    
    const request = this.mintRequests.find(r => r.authorizationCode === authorizationCode);
    if (!request) {
      return {
        success: false,
        error: 'Mint request not found',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    request.status = 'rejected';
    
    // Log event
    const event: WebhookEvent = {
      id: generateRandomId(),
      type: 'mint.rejected',
      timestamp: new Date().toISOString(),
      payload: { authorizationCode, reason, rejectedBy },
      signature: this.createWebhookSignature({ authorizationCode, reason, rejectedBy }),
      source: 'lemx_platform'
    };
    this.webhookEvents.push(event);

    this.saveToStorage();

    return {
      success: true,
      data: request,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFY DCB TREASURY: LOCK APPROVED
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyDCBTreasuryLockApproved(data: {
    lockId: string;
    authorizationCode: string;
    originalAmount: string;
    approvedAmount: string;
    approvedBy: string;
    approvedAt: string;
    beneficiary: string;
    bankName: string;
  }): Promise<APIResponse<{ notified: boolean; remainingAmount: string }>> {
    const requestId = generateRandomId();
    
    // Calculate remaining amount for Lock Reserve
    const originalAmt = parseFloat(data.originalAmount);
    const approvedAmt = parseFloat(data.approvedAmount);
    const remainingAmount = (originalAmt - approvedAmt).toFixed(2);
    
    // Generate blockchain signatures for the approval
    const signatures = [
      {
        role: 'DAES_APPROVER',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.lockId + data.approvedAmount + Date.now()),
        timestamp: new Date().toISOString()
      },
      {
        role: 'BANK_APPROVER',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.authorizationCode + data.approvedAmount + Date.now()),
        timestamp: new Date().toISOString()
      },
      {
        role: 'LEMX_APPROVER',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.approvedBy + data.approvedAmount + Date.now()),
        timestamp: new Date().toISOString()
      }
    ];
    
    try {
      console.log('📤 Sending lock approval to DCB Treasury...');
      console.log('   Lock ID:', data.lockId);
      console.log('   Auth Code:', data.authorizationCode);
      console.log('   Original Amount:', data.originalAmount);
      console.log('   Approved Amount:', data.approvedAmount);
      console.log('   Remaining Amount:', remainingAmount);
      
      // Build the payload explicitly to ensure all fields are included
      const payload = {
        lockId: data.lockId,
        authorizationCode: data.authorizationCode,
        originalAmount: data.originalAmount,
        approvedAmount: data.approvedAmount,
        remainingAmount: remainingAmount,  // CRITICAL: Must be included
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        beneficiary: data.beneficiary,
        bankName: data.bankName,
        signatures: signatures
      };
      
      console.log('📦 Payload to send:', JSON.stringify(payload, null, 2));
      
      // Send notification to DCB Treasury via bridge server
      const response = await fetch(`${API_CONFIG.DCB_TREASURY_URL}/api/lock-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DCB Treasury response error:', response.status, errorText);
        throw new Error(`Failed to notify DCB Treasury: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('✅ DCB Treasury response:', responseData.success);
      
      // Update local mint request with approved amount
      const request = this.mintRequests.find(r => r.authorizationCode === data.authorizationCode);
      if (request) {
        request.status = 'approved';
        request.requestedAmount = data.approvedAmount;
        console.log('   Updated mint request status to approved');
      }
      
      // Update or remove from pending locks
      const lockIdx = this.pendingLocks.findIndex(l => l.lockId === data.lockId);
      if (lockIdx >= 0) {
        const remaining = parseFloat(remainingAmount);
        if (remaining > 0) {
          // Update the lock amount to remaining
          this.pendingLocks[lockIdx].lockDetails.amount = remainingAmount;
          console.log(`   Updated lock amount to remaining: $${remainingAmount}`);
        } else {
          // Remove the lock entirely
          this.pendingLocks.splice(lockIdx, 1);
          console.log('   Removed lock from pending (fully consumed)');
        }
      } else {
        console.warn('   Lock not found in pending locks:', data.lockId);
      }
      
      // Log event
      const event: WebhookEvent = {
        id: generateRandomId(),
        type: 'lock.approved',
        timestamp: new Date().toISOString(),
        payload: { ...data, remainingAmount, signatures },
        signature: this.createWebhookSignature(data),
        source: 'lemx_platform'
      };
      this.webhookEvents.push(event);
      
      this.saveToStorage();
      
      // Notify listeners to refresh UI
      this.notifyListeners(event);
      
      console.log('✅ Lock approval complete!');
      console.log(`   Original: $${data.originalAmount} | Approved: $${data.approvedAmount} | Remaining: $${remainingAmount}`);
      
      return {
        success: true,
        data: { notified: true, remainingAmount },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      console.error('❌ Error notifying DCB Treasury:', error);
      
      // Still update local state even if notification fails
      const request = this.mintRequests.find(r => r.authorizationCode === data.authorizationCode);
      if (request) {
        request.status = 'approved';
        request.requestedAmount = data.approvedAmount;
      }
      
      // Also update local lock
      const lockIdx = this.pendingLocks.findIndex(l => l.lockId === data.lockId);
      if (lockIdx >= 0) {
        const remaining = parseFloat(remainingAmount);
        if (remaining > 0) {
          this.pendingLocks[lockIdx].lockDetails.amount = remainingAmount;
        } else {
          this.pendingLocks.splice(lockIdx, 1);
        }
      }
      
      this.saveToStorage();
      
      return {
        success: false,
        error: error.message || 'Failed to notify DCB Treasury',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFY DCB TREASURY: LOCK REJECTED
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyDCBTreasuryLockRejected(data: {
    lockId: string;
    authorizationCode: string;
    amount: string;
    rejectedBy: string;
    rejectedAt: string;
    reason: string;
    bankName: string;
    beneficiary?: string;
  }): Promise<APIResponse<{ notified: boolean }>> {
    const requestId = generateRandomId();
    
    const signatures = [{
      role: 'REJECTION_CONTRACT',
      address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      hash: sha256(data.lockId + data.reason + Date.now()),
      timestamp: new Date().toISOString()
    }];
    
    try {
      const response = await fetch(`${API_CONFIG.DCB_TREASURY_URL}/api/lock-rejected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, signatures })
      });
      
      if (!response.ok) {
        throw new Error('Failed to notify DCB Treasury');
      }
      
      // Update local state - mark mint request as rejected
      const request = this.mintRequests.find(r => r.authorizationCode === data.authorizationCode);
      if (request) {
        request.status = 'rejected';
      }
      
      // Get beneficiary from pending lock before removing
      const pendingLock = this.pendingLocks.find(l => l.lockId === data.lockId);
      const beneficiary = data.beneficiary || pendingLock?.lockDetails?.beneficiary || 'N/A';
      
      // Remove from pending locks
      this.pendingLocks = this.pendingLocks.filter(l => l.lockId !== data.lockId);
      
      // ADD TO REJECTED LOCKS ARRAY FOR PERSISTENCE
      const rejectedLock: RejectedLock = {
        lockId: data.lockId,
        authorizationCode: data.authorizationCode,
        amount: data.amount,
        rejectedBy: data.rejectedBy,
        rejectedAt: data.rejectedAt,
        reason: data.reason,
        bankName: data.bankName,
        beneficiary: beneficiary,
        signatures: signatures
      };
      
      // Check if not already in rejected list
      if (!this.rejectedLocks.find(r => r.lockId === data.lockId)) {
        this.rejectedLocks.push(rejectedLock);
        console.log('[APIBridge] ❌ Lock added to rejected list:', data.lockId, '- Total rejected:', this.rejectedLocks.length);
      }
      
      // Log event
      const event: WebhookEvent = {
        id: generateRandomId(),
        type: 'mint.rejected',
        timestamp: new Date().toISOString(),
        payload: { ...data, signatures, beneficiary },
        signature: this.createWebhookSignature(data),
        source: 'lemx_platform'
      };
      this.webhookEvents.push(event);
      
      this.saveToStorage();
      this.notifyListeners(event);
      
      console.log('📤 Lock rejection notification sent to DCB Treasury:', data.lockId);
      
      return {
        success: true,
        data: { notified: true },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      console.error('Error notifying DCB Treasury:', error);
      return {
        success: false,
        error: error.message || 'Failed to notify DCB Treasury',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFY DCB TREASURY: MINT COMPLETED
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyDCBTreasuryMintCompleted(data: {
    lockId: string;
    authorizationCode: string;
    publicationCode: string;
    amount: string;
    mintedBy: string;
    mintedAt: string;
    txHash: string;
    blockNumber: number;
    beneficiary: string;
    bankName: string;
    lusdContractAddress: string;
    lockContractHash?: string;
    lusdMintHash?: string;
  }): Promise<APIResponse<{ notified: boolean }>> {
    const requestId = generateRandomId();
    
    const signatures = [
      {
        role: 'VUSD_MINT_CONTRACT',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.amount + data.beneficiary + Date.now()),
        timestamp: new Date().toISOString(),
        txHash: data.txHash,
        blockNumber: data.blockNumber
      },
      {
        role: 'TREASURY_VAULT',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.lockId + data.amount + Date.now()),
        timestamp: new Date().toISOString()
      },
      {
        role: 'LEMX_FINAL_SIGNER',
        address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        hash: sha256(data.publicationCode + Date.now()),
        timestamp: new Date().toISOString()
      }
    ];
    
    try {
      const response = await fetch(`${API_CONFIG.DCB_TREASURY_URL}/api/mint-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, signatures })
      });
      
      if (!response.ok) {
        throw new Error('Failed to notify DCB Treasury');
      }
      
      console.log('📤 Mint completion notification sent to DCB Treasury:', data.lockId);
      
      return {
        success: true,
        data: { notified: true },
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      console.error('Error notifying DCB Treasury:', error);
      return {
        success: false,
        error: error.message || 'Failed to notify DCB Treasury',
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  confirmMint(confirmation: MintConfirmation): APIResponse<MintConfirmation> {
    const requestId = generateRandomId();
    
    const request = this.mintRequests.find(r => r.authorizationCode === confirmation.authorizationCode);
    if (!request) {
      return {
        success: false,
        error: 'Mint request not found',
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    request.status = 'minted';
    this.completedMints.push(confirmation);

    // Remove from pending locks
    this.pendingLocks = this.pendingLocks.filter(l => l.authorizationCode !== confirmation.authorizationCode);

    // Log event
    const event: WebhookEvent = {
      id: generateRandomId(),
      type: 'mint.completed',
      timestamp: new Date().toISOString(),
      payload: confirmation,
      signature: this.createWebhookSignature(confirmation),
      source: 'lemx_platform'
    };
    this.webhookEvents.push(event);

    this.saveToStorage();

    return {
      success: true,
      data: confirmation,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getPendingLocks(): LockNotification[] {
    return this.pendingLocks;
  }

  getMintRequests(status?: MintRequest['status']): MintRequest[] {
    if (status) {
      return this.mintRequests.filter(r => r.status === status);
    }
    return [...this.mintRequests];
  }

  getMintRequestByCode(code: string): MintRequest | undefined {
    return this.mintRequests.find(r => r.authorizationCode === code);
  }

  getLockByCode(code: string): LockNotification | undefined {
    return this.pendingLocks.find(l => l.authorizationCode === code);
  }

  getCompletedMints(): MintConfirmation[] {
    return [...this.completedMints];
  }
  
  // Get approved mints (status = 'approved')
  getApprovedMints(): MintRequest[] {
    return this.mintRequests.filter(r => r.status === 'approved');
  }

  getWebhookEvents(limit: number = 50): WebhookEvent[] {
    return this.webhookEvents.slice(-limit).reverse();
  }
  
  getMintExplorerEvents(): MintExplorerEvent[] {
    return this.mintExplorerEvents;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  getStatistics(): {
    pendingLocks: number;
    pendingMints: number;
    approvedMints: number;
    completedMints: number;
    rejectedMints: number;
    rejectedLocks: number;
    totalVolume: string;
  } {
    const pending = this.mintRequests.filter(r => r.status === 'pending').length;
    const approved = this.mintRequests.filter(r => r.status === 'approved').length;
    const completed = this.mintRequests.filter(r => r.status === 'minted').length;
    const rejectedRequests = this.mintRequests.filter(r => r.status === 'rejected').length;

    const totalVolume = this.completedMints.reduce((sum, m) => sum + parseFloat(m.mintedAmount), 0);

    // Total rejected = rejected mint requests + rejected locks
    const totalRejected = rejectedRequests + this.rejectedLocks.length;

    return {
      pendingLocks: this.pendingLocks.length,
      pendingMints: pending,
      approvedMints: approved,
      completedMints: completed,
      rejectedMints: totalRejected,
      rejectedLocks: this.rejectedLocks.length,
      totalVolume: totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }
  
  // Get rejected locks
  getRejectedLocks(): RejectedLock[] {
    return [...this.rejectedLocks];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATION (For testing without real DCB Treasury connection)
  // ═══════════════════════════════════════════════════════════════════════════

  async simulateLockFromDCB(): Promise<LockNotification> {
    try {
      // Send to bridge server - this will broadcast via WebSocket
      const response = await fetch(`${API_CONFIG.LEMX_PLATFORM_URL}/api/sandbox/simulate-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.lock) {
          console.log('🔒 Lock simulado via servidor:', data.data.lock.lockId);
          return data.data.lock;
        }
      }
    } catch (error) {
      console.error('Error calling sandbox API, falling back to local:', error);
    }

    // Fallback to local simulation
    const lockId = `LOCK-${Date.now().toString(36).toUpperCase()}`;
    const authCode = `MINT-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const notification: LockNotification = {
      id: generateRandomId(),
      lockId,
      authorizationCode: authCode,
      timestamp: new Date().toISOString(),
      lockDetails: {
        amount: (Math.random() * 1000000 + 10000).toFixed(2),
        currency: 'USD',
        beneficiary: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        custodyVault: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      bankInfo: {
        bankId: 'BANK-DCB-001',
        bankName: 'Digital Commercial Bank Ltd.',
        signerAddress: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      },
      sourceOfFunds: {
        accountId: 'ACC-' + Date.now().toString(36).toUpperCase(),
        accountName: 'DCB Treasury Reserve',
        accountType: 'banking',
        originalBalance: (Math.random() * 10000000 + 1000000).toFixed(2)
      },
      signatures: [
        {
          role: 'DAES_SIGNER',
          address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
          hash: sha256(authCode + Date.now()),
          timestamp: new Date().toISOString()
        },
        {
          role: 'BANK_SIGNER',
          address: '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
          hash: sha256(lockId + Date.now()),
          timestamp: new Date().toISOString()
        }
      ],
      blockchain: {
        txHash: '0x' + Array(64).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
        chainId: 1006,
        network: 'LemonChain'
      },
      isoData: {
        messageId: `ISO-${Date.now()}`,
        uetr: `${generateRandomId()}-${generateRandomId()}`.substring(0, 36),
        isoHash: sha256(`ISO-${Date.now()}-${authCode}`)
      }
    };

    this.receiveLockNotification(notification);
    return notification;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR DATA (for reset)
  // ═══════════════════════════════════════════════════════════════════════════

  clearAllData(): void {
    this.pendingLocks = [];
    this.mintRequests = [];
    this.webhookEvents = [];
    this.completedMints = [];
    this.rejectedLocks = [];
    this.mintExplorerEvents = [];
    
    // Clear ALL localStorage keys - Treasury Minting / LEMX
    localStorage.removeItem(PENDING_LOCKS_KEY);
    localStorage.removeItem(MINT_REQUESTS_KEY);
    localStorage.removeItem(WEBHOOK_EVENTS_KEY);
    localStorage.removeItem(COMPLETED_MINTS_KEY);
    localStorage.removeItem(REJECTED_LOCKS_KEY);
    localStorage.removeItem('lemx_pending_locks');
    localStorage.removeItem('lemx_mint_requests');
    localStorage.removeItem('lemx_mint_with_code_queue');
    localStorage.removeItem('lemx_mint_explorer');
    localStorage.removeItem('lemx_webhook_events');
    localStorage.removeItem('lemx_approved_mints');
    localStorage.removeItem('lemx_completed_mints');
    localStorage.removeItem('lemx_rejected_mints');
    localStorage.removeItem('lemx_rejected_locks');
    localStorage.removeItem('lemx_statistics');
    localStorage.removeItem('lemx_mint_authorization_requests');
    localStorage.removeItem('api_bridge_pending_locks');
    localStorage.removeItem('api_bridge_mint_requests');
    localStorage.removeItem('api_bridge_webhook_events');
    localStorage.removeItem('api_bridge_completed_mints');
    localStorage.removeItem('api_bridge_rejected_locks');
    
    // Clear ALL localStorage keys - DCB Treasury
    localStorage.removeItem('dcb_treasury_contracts');
    localStorage.removeItem('dcb_treasury_banks');
    localStorage.removeItem('dcb_treasury_custodies');
    localStorage.removeItem('dcb_treasury_locks');
    localStorage.removeItem('dcb_minted_locks');
    localStorage.removeItem('dcb_lemx_approval_statuses');
    localStorage.removeItem('dcb_mint_lemon_explorer_lusd');
    localStorage.removeItem('dcb_pending_mint_authorizations');
    localStorage.removeItem('dcb_lemx_approvals');
    
    // Clear any remaining data keys dynamically
    const keysToRemove = Object.keys(localStorage).filter(k => 
      (k.startsWith('lemx_') || k.startsWith('dcb_') || k.startsWith('api_bridge_')) &&
      !k.includes('session') && !k.includes('user') && !k.includes('login') && !k.includes('auth')
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    console.log('🗑️ All API bridge data and ALL localStorage cleared (both platforms)');
  }

  // Reset sandbox - clear all data and notify server
  async resetSandbox(): Promise<boolean> {
    try {
      const confirmed = window.confirm(
        '🔄 RESET SANDBOX\n\n' +
        '¿Estás seguro de que quieres resetear el sandbox?\n\n' +
        'Esto eliminará:\n' +
        '• Todos los Locks pendientes\n' +
        '• Todos los Mints en cola\n' +
        '• Historial de Minting\n' +
        '• Datos del servidor\n' +
        '• Todos los valores volverán a 0\n\n' +
        'Esta acción no se puede deshacer.'
      );
      
      if (!confirmed) return false;
      
      console.log('🔄 ═══════════════════════════════════════════════════════════════════');
      console.log('   RESET SANDBOX - INICIANDO...');
      console.log('═══════════════════════════════════════════════════════════════════════');
      
      // Clear server data on both ports
      try {
        const response1 = await fetch('http://localhost:4010/api/clear-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: 'CLEAR_ALL_DATA' })
        });
        const result1 = await response1.json();
        console.log('✅ DCB Treasury server cleared:', result1);
      } catch (error) {
        console.warn('⚠️ Could not clear DCB Treasury server:', error);
      }
      
      try {
        const response2 = await fetch('http://localhost:4011/api/clear-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: 'CLEAR_ALL_DATA' })
        });
        const result2 = await response2.json();
        console.log('✅ LEMX Minting server cleared:', result2);
      } catch (error) {
        console.warn('⚠️ Could not clear LEMX Minting server:', error);
      }
      
      // Clear local data
      this.clearAllData();
      
      // Force refresh from server (should return empty arrays now)
      await this.pollData();
      
      console.log('═══════════════════════════════════════════════════════════════════════');
      console.log('   ✅ SANDBOX RESET COMPLETE - ALL VALUES ARE NOW 0');
      console.log('═══════════════════════════════════════════════════════════════════════\n');
      
      return true;
    } catch (error) {
      console.error('❌ Error resetting sandbox:', error);
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const apiBridge = new APIBridge();
