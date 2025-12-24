/**
 * KuCoin API Client - Professional Integration
 * 
 * Endpoints:
 * - Producción: https://api.kucoin.com
 * - Broker: https://api-broker.kucoin.com
 * - Futures: https://api-futures.kucoin.com
 * 
 * Features:
 * - REST API para ejecución
 * - WebSocket (Pub/Sub) para monitoreo en tiempo real
 * - Balance tracking automático
 * - Order status notifications
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface KuCoinConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  isConfigured: boolean;
  environment: 'production' | 'broker' | 'futures';
}

export interface KuCoinAccount {
  id: string;
  currency: string;
  type: 'main' | 'trade' | 'margin';
  balance: string;
  available: string;
  holds: string;
}

export interface KuCoinOrder {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  funds?: string;
  size?: string;
  dealFunds?: string;
  dealSize?: string;
  fee?: string;
  feeCurrency?: string;
  status: string;
  createdAt: number;
}

export interface KuCoinWithdrawal {
  withdrawalId: string;
  currency: string;
  amount: string;
  address: string;
  network: string;
  fee: string;
  status: string;
  createdAt: number;
}

export interface KuCoinTransfer {
  orderId: string;
  currency: string;
  from: string;
  to: string;
  amount: string;
  createdAt: number;
}

export interface FlowOperation {
  id: string;
  type: 'transfer' | 'order' | 'withdrawal' | 'websocket' | 'balance';
  status: 'pending' | 'success' | 'failed' | 'listening';
  data: any;
  message: string;
  timestamp: string;
}

export interface FiatToUSDTFlow {
  id: string;
  usdAmount: string;
  destAddress: string;
  network: string;
  operations: FlowOperation[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting_deposit';
  usdtReceived?: string;
  withdrawalId?: string;
  fee?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export type NetworkType = 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | 'MATIC' | 'ALGO';
export type EnvironmentType = 'production' | 'broker' | 'futures';

export interface WebSocketMessage {
  type: string;
  topic: string;
  subject: string;
  data: any;
  channelType?: string;
  sn?: number;
}

export interface BalanceChangeEvent {
  accountId: string;
  currency: string;
  total: string;
  available: string;
  hold: string;
  availableChange: string;
  holdChange: string;
  relationContext: {
    symbol?: string;
    orderId?: string;
  };
  relationEvent: string;
  relationEventId: string;
  time: string;
}

export interface OrderChangeEvent {
  orderId: string;
  symbol: string;
  type: string;
  side: string;
  price: string;
  size: string;
  filledSize: string;
  remainSize: string;
  status: string;
  ts: number;
}

export interface BulletToken {
  token: string;
  instanceServers: {
    endpoint: string;
    protocol: string;
    encrypt: boolean;
    pingInterval: number;
    pingTimeout: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const API_ENDPOINTS = {
  production: 'https://api.kucoin.com',
  broker: 'https://api-broker.kucoin.com',
  futures: 'https://api-futures.kucoin.com',
};

const CONFIG_KEY = 'kucoin_config';
const FLOWS_KEY = 'kucoin_flows';
const EVENTS_KEY = 'kucoin_events';

export const SUPPORTED_NETWORKS: { id: NetworkType; name: string; fee: string }[] = [
  { id: 'TRC20', name: 'Tron (TRC20)', fee: '~1 USDT' },
  { id: 'ERC20', name: 'Ethereum (ERC20)', fee: '~5-20 USDT' },
  { id: 'BEP20', name: 'BNB Smart Chain (BEP20)', fee: '~0.8 USDT' },
  { id: 'SOL', name: 'Solana', fee: '~1 USDT' },
  { id: 'MATIC', name: 'Polygon', fee: '~1 USDT' },
  { id: 'ALGO', name: 'Algorand', fee: '~0.1 USDT' },
];

// Endpoints clave
export const REST_ENDPOINTS = {
  // Cuentas
  accounts: '/api/v1/accounts',
  accountDetail: '/api/v1/accounts/:accountId',
  
  // Transferencias internas
  innerTransfer: '/api/v2/accounts/inner-transfer',
  
  // Trading
  orders: '/api/v1/orders',
  orderDetail: '/api/v1/orders/:orderId',
  
  // Retiros
  withdrawals: '/api/v3/withdrawals',
  withdrawalQuotas: '/api/v1/withdrawals/quotas',
  
  // WebSocket Token
  bulletPublic: '/api/v1/bullet-public',
  bulletPrivate: '/api/v1/bullet-private',
};

// Canales WebSocket
export const WS_CHANNELS = {
  balance: '/account/balance',           // v2/account/balance - Cambios en balance
  orders: '/spotMarket/tradeOrders',     // Estado de órdenes
  orderChange: '/spotMarket/orderChange', // Cambios en órdenes (más detallado)
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE FIRMA
// ═══════════════════════════════════════════════════════════════════════════

async function createSignature(
  timestamp: string,
  method: string,
  endpoint: string,
  body: string,
  secret: string
): Promise<string> {
  const message = timestamp + method + endpoint + body;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function encryptPassphrase(passphrase: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(passphrase);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE KUCOIN
// ═══════════════════════════════════════════════════════════════════════════

export class KuCoinClient {
  private config: KuCoinConfig;
  private flows: FiatToUSDTFlow[];
  private events: FlowOperation[];
  private ws: WebSocket | null = null;
  private wsToken: BulletToken | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private isWsConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.config = this.loadConfig();
    this.flows = this.loadFlows();
    this.events = this.loadEvents();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Configuración
  // ─────────────────────────────────────────────────────────────────────────

  private loadConfig(): KuCoinConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[KuCoin] Error loading config:', e);
    }
    return {
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      isConfigured: false,
      environment: 'production',
    };
  }

  private saveConfig(): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  getConfig(): KuCoinConfig {
    return { ...this.config };
  }

  setConfig(apiKey: string, apiSecret: string, passphrase: string, environment: EnvironmentType = 'production'): void {
    this.config = {
      apiKey,
      apiSecret,
      passphrase,
      isConfigured: !!(apiKey && apiSecret && passphrase),
      environment,
    };
    this.saveConfig();
  }

  isConfigured(): boolean {
    return this.config.isConfigured;
  }

  getBaseUrl(): string {
    return API_ENDPOINTS[this.config.environment];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Events Storage
  // ─────────────────────────────────────────────────────────────────────────

  private loadEvents(): FlowOperation[] {
    try {
      const stored = localStorage.getItem(EVENTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[KuCoin] Error loading events:', e);
    }
    return [];
  }

  private saveEvents(): void {
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
    localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
  }

  getEvents(): FlowOperation[] {
    return [...this.events];
  }

  addEvent(event: Omit<FlowOperation, 'id' | 'timestamp'>): FlowOperation {
    const newEvent: FlowOperation = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(newEvent);
    this.saveEvents();
    this.emit('event', newEvent);
    return newEvent;
  }

  clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Flows
  // ─────────────────────────────────────────────────────────────────────────

  private loadFlows(): FiatToUSDTFlow[] {
    try {
      const stored = localStorage.getItem(FLOWS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[KuCoin] Error loading flows:', e);
    }
    return [];
  }

  private saveFlows(): void {
    localStorage.setItem(FLOWS_KEY, JSON.stringify(this.flows));
  }

  getFlows(): FiatToUSDTFlow[] {
    return [...this.flows];
  }

  clearFlows(): void {
    this.flows = [];
    this.saveFlows();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Emitter
  // ─────────────────────────────────────────────────────────────────────────

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REST API Requests
  // ─────────────────────────────────────────────────────────────────────────

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any,
    useProxy: boolean = true
  ): Promise<any> {
    const timestamp = Date.now().toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    
    const signature = await createSignature(
      timestamp,
      method,
      endpoint,
      bodyStr,
      this.config.apiSecret
    );
    
    const encryptedPassphrase = await encryptPassphrase(
      this.config.passphrase,
      this.config.apiSecret
    );

    const url = useProxy 
      ? '/api/kucoin' + endpoint 
      : this.getBaseUrl() + endpoint;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'KC-API-KEY': this.config.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': encryptedPassphrase,
      'KC-API-KEY-VERSION': '2',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    const data = await response.json();

    if (data.code && data.code !== '200000') {
      throw new Error(data.msg || `KuCoin API Error: ${data.code}`);
    }

    return data.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebSocket Management
  // ─────────────────────────────────────────────────────────────────────────

  async getBulletToken(isPrivate: boolean = true): Promise<BulletToken> {
    const endpoint = isPrivate ? REST_ENDPOINTS.bulletPrivate : REST_ENDPOINTS.bulletPublic;
    const method = 'POST';
    
    const result = await this.makeRequest(method, endpoint, {});
    
    this.wsToken = {
      token: result.token,
      instanceServers: result.instanceServers,
    };
    
    return this.wsToken;
  }

  async connectWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[KuCoin WS] Already connected');
      return;
    }

    if (!this.config.isConfigured) {
      throw new Error('API credentials not configured');
    }

    // Get bullet token for private channels
    const bullet = await this.getBulletToken(true);
    
    if (!bullet.instanceServers || bullet.instanceServers.length === 0) {
      throw new Error('No WebSocket servers available');
    }

    const server = bullet.instanceServers[0];
    const connectId = Date.now();
    const wsUrl = `${server.endpoint}?token=${bullet.token}&connectId=${connectId}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[KuCoin WS] Connected');
        this.isWsConnected = true;
        this.reconnectAttempts = 0;
        
        // Start ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              id: Date.now(),
              type: 'ping',
            }));
          }
        }, server.pingInterval);

        this.addEvent({
          type: 'websocket',
          status: 'success',
          data: { server: server.endpoint },
          message: '✓ WebSocket conectado a KuCoin',
        });

        this.emit('ws:connected', { server: server.endpoint });
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleWebSocketMessage(msg);
        } catch (e) {
          console.error('[KuCoin WS] Parse error:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[KuCoin WS] Error:', error);
        this.addEvent({
          type: 'websocket',
          status: 'failed',
          data: { error },
          message: '✗ Error en WebSocket',
        });
        this.emit('ws:error', error);
      };

      this.ws.onclose = (event) => {
        console.log('[KuCoin WS] Closed:', event.code, event.reason);
        this.isWsConnected = false;
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        this.addEvent({
          type: 'websocket',
          status: 'failed',
          data: { code: event.code, reason: event.reason },
          message: `WebSocket desconectado (${event.code})`,
        });

        this.emit('ws:disconnected', { code: event.code, reason: event.reason });

        // Auto reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[KuCoin WS] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connectWebSocket(), 5000);
        }
      };

      // Timeout for connection
      setTimeout(() => {
        if (!this.isWsConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private handleWebSocketMessage(msg: any): void {
    // Handle pong
    if (msg.type === 'pong') {
      return;
    }

    // Handle welcome
    if (msg.type === 'welcome') {
      console.log('[KuCoin WS] Welcome received, ID:', msg.id);
      return;
    }

    // Handle ack (subscription confirmation)
    if (msg.type === 'ack') {
      console.log('[KuCoin WS] Subscription confirmed:', msg.id);
      return;
    }

    // Handle message
    if (msg.type === 'message') {
      const topic = msg.topic;
      const data = msg.data;

      console.log('[KuCoin WS] Message:', topic, data);

      // Balance change event
      if (topic === '/account/balance') {
        this.handleBalanceChange(data as BalanceChangeEvent);
      }

      // Order change event
      if (topic.includes('/spotMarket/tradeOrders') || topic.includes('/spotMarket/orderChange')) {
        this.handleOrderChange(data as OrderChangeEvent);
      }

      this.emit('ws:message', { topic, data });
    }
  }

  private handleBalanceChange(data: BalanceChangeEvent): void {
    const event = this.addEvent({
      type: 'balance',
      status: 'success',
      data,
      message: `Balance ${data.currency}: ${data.available} (${data.availableChange > '0' ? '+' : ''}${data.availableChange})`,
    });

    this.emit('balance:change', data);

    // Auto-trigger: Si detectamos USD entrando, notificar
    if (data.currency === 'USD' && parseFloat(data.availableChange) > 0) {
      this.emit('usd:deposit', {
        amount: data.availableChange,
        total: data.available,
        event: data.relationEvent,
      });
    }

    // Si detectamos USDT entrando (después de compra)
    if (data.currency === 'USDT' && parseFloat(data.availableChange) > 0) {
      this.emit('usdt:received', {
        amount: data.availableChange,
        total: data.available,
      });
    }
  }

  private handleOrderChange(data: OrderChangeEvent): void {
    const statusText = data.status === 'done' ? '✓ Completada' : 
                       data.status === 'open' ? '⏳ Abierta' : 
                       data.status === 'match' ? '🔄 Parcial' : data.status;

    this.addEvent({
      type: 'order',
      status: data.status === 'done' ? 'success' : 'pending',
      data,
      message: `Orden ${data.symbol} ${data.side.toUpperCase()}: ${statusText}`,
    });

    this.emit('order:change', data);

    // Si la orden está completa
    if (data.status === 'done') {
      this.emit('order:filled', data);
    }
  }

  async subscribe(topic: string, privateChannel: boolean = true): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const subMessage = {
      id: Date.now(),
      type: 'subscribe',
      topic,
      privateChannel,
      response: true,
    };

    this.ws.send(JSON.stringify(subMessage));
    console.log('[KuCoin WS] Subscribed to:', topic);

    this.addEvent({
      type: 'websocket',
      status: 'listening',
      data: { topic, privateChannel },
      message: `Suscrito a: ${topic}`,
    });
  }

  async unsubscribe(topic: string, privateChannel: boolean = true): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubMessage = {
      id: Date.now(),
      type: 'unsubscribe',
      topic,
      privateChannel,
      response: true,
    };

    this.ws.send(JSON.stringify(unsubMessage));
  }

  disconnectWebSocket(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWsConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  isWebSocketConnected(): boolean {
    return this.isWsConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Account Methods
  // ─────────────────────────────────────────────────────────────────────────

  async getAccounts(currency?: string, accountType?: string): Promise<KuCoinAccount[]> {
    let endpoint = REST_ENDPOINTS.accounts;
    const params: string[] = [];
    if (currency) params.push(`currency=${currency}`);
    if (accountType) params.push(`type=${accountType}`);
    if (params.length > 0) endpoint += '?' + params.join('&');
    
    return await this.makeRequest('GET', endpoint);
  }

  async getAccountBalance(currency: string, accountType: 'main' | 'trade'): Promise<string> {
    const accounts = await this.getAccounts(currency, accountType);
    if (accounts && accounts.length > 0) {
      return accounts[0].available;
    }
    return '0';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transfer Methods
  // ─────────────────────────────────────────────────────────────────────────

  async innerTransfer(
    currency: string,
    from: 'main' | 'trade',
    to: 'main' | 'trade',
    amount: string
  ): Promise<KuCoinTransfer> {
    const clientOid = `transfer_${Date.now()}`;
    
    const result = await this.makeRequest('POST', REST_ENDPOINTS.innerTransfer, {
      clientOid,
      currency,
      from,
      to,
      amount,
    });

    return {
      orderId: result.orderId,
      currency,
      from,
      to,
      amount,
      createdAt: Date.now(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Trading Methods
  // ─────────────────────────────────────────────────────────────────────────

  async createMarketOrder(
    symbol: string,
    side: 'buy' | 'sell',
    funds?: string,
    size?: string
  ): Promise<KuCoinOrder> {
    const clientOid = `order_${Date.now()}`;
    
    const body: any = {
      clientOid,
      symbol,
      side,
      type: 'market',
    };

    if (funds) body.funds = funds;
    if (size) body.size = size;

    const result = await this.makeRequest('POST', REST_ENDPOINTS.orders, body);

    return {
      orderId: result.orderId,
      symbol,
      side,
      type: 'market',
      funds,
      size,
      status: 'done',
      createdAt: Date.now(),
    };
  }

  async getOrderDetails(orderId: string): Promise<KuCoinOrder> {
    const endpoint = REST_ENDPOINTS.orderDetail.replace(':orderId', orderId);
    return await this.makeRequest('GET', endpoint);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Withdrawal Methods
  // ─────────────────────────────────────────────────────────────────────────

  async applyWithdrawal(
    currency: string,
    address: string,
    amount: string,
    network: string,
    memo?: string
  ): Promise<KuCoinWithdrawal> {
    const body: any = {
      currency,
      address,
      amount,
      chain: network,
    };

    if (memo) body.memo = memo;

    const result = await this.makeRequest('POST', REST_ENDPOINTS.withdrawals, body);

    return {
      withdrawalId: result.withdrawalId,
      currency,
      amount,
      address,
      network,
      fee: result.fee || '0',
      status: 'processing',
      createdAt: Date.now(),
    };
  }

  async getWithdrawalQuotas(currency: string, network?: string): Promise<any> {
    let endpoint = `${REST_ENDPOINTS.withdrawalQuotas}?currency=${currency}`;
    if (network) endpoint += `&chain=${network}`;
    return await this.makeRequest('GET', endpoint);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Complete Flow: Fiat USD → USDT → Withdrawal
  // ─────────────────────────────────────────────────────────────────────────

  async executeFiatToUSDTFlow(
    usdAmount: string,
    destAddress: string,
    network: NetworkType,
    onProgress?: (operation: FlowOperation) => void
  ): Promise<FiatToUSDTFlow> {
    const flowId = `flow_${Date.now()}`;
    const flow: FiatToUSDTFlow = {
      id: flowId,
      usdAmount,
      destAddress,
      network,
      operations: [],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };

    const addOperation = (op: Omit<FlowOperation, 'id' | 'timestamp'>) => {
      const operation: FlowOperation = {
        ...op,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      flow.operations.push(operation);
      onProgress?.(operation);
      this.emit('flow:progress', { flow, operation });
      return operation;
    };

    try {
      // PASO 1: Transferir USD de Main a Trade
      addOperation({
        type: 'transfer',
        status: 'pending',
        data: { currency: 'USD', from: 'main', to: 'trade', amount: usdAmount },
        message: `Transfiriendo ${usdAmount} USD de Main a Trade...`,
      });

      const transfer1 = await this.innerTransfer('USD', 'main', 'trade', usdAmount);
      
      addOperation({
        type: 'transfer',
        status: 'success',
        data: transfer1,
        message: `✓ USD transferido a cuenta de Trading`,
      });

      // Esperar un momento para que se actualice el balance
      await new Promise(resolve => setTimeout(resolve, 2000));

      // PASO 2: Comprar USDT con USD (Market Order)
      addOperation({
        type: 'order',
        status: 'pending',
        data: { symbol: 'USDT-USD', side: 'buy', funds: usdAmount },
        message: `Comprando USDT con ${usdAmount} USD...`,
      });

      const order = await this.createMarketOrder('USDT-USD', 'buy', usdAmount);
      
      addOperation({
        type: 'order',
        status: 'success',
        data: order,
        message: `✓ Orden ejecutada. ID: ${order.orderId}`,
      });

      // Esperar para que el motor de calce actualice el balance
      await new Promise(resolve => setTimeout(resolve, 3000));

      // PASO 3: Verificar saldo USDT obtenido
      const usdtBalance = await this.getAccountBalance('USDT', 'trade');
      flow.usdtReceived = usdtBalance;

      addOperation({
        type: 'balance',
        status: 'success',
        data: { usdtBalance },
        message: `✓ USDT disponible: ${usdtBalance}`,
      });

      if (parseFloat(usdtBalance) <= 0) {
        throw new Error('No se encontró saldo de USDT tras la compra');
      }

      // PASO 4: Transferir USDT de Trade a Main
      addOperation({
        type: 'transfer',
        status: 'pending',
        data: { currency: 'USDT', from: 'trade', to: 'main', amount: usdtBalance },
        message: `Moviendo ${usdtBalance} USDT a cuenta Principal...`,
      });

      const transfer2 = await this.innerTransfer('USDT', 'trade', 'main', usdtBalance);
      
      addOperation({
        type: 'transfer',
        status: 'success',
        data: transfer2,
        message: `✓ USDT transferido a cuenta Principal`,
      });

      // Esperar un momento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // PASO 5: Solicitar retiro (Withdrawal)
      addOperation({
        type: 'withdrawal',
        status: 'pending',
        data: { currency: 'USDT', address: destAddress, amount: usdtBalance, network },
        message: `Enviando ${usdtBalance} USDT a ${destAddress.slice(0, 10)}... via ${network}...`,
      });

      const withdrawal = await this.applyWithdrawal('USDT', destAddress, usdtBalance, network);
      flow.withdrawalId = withdrawal.withdrawalId;
      flow.fee = withdrawal.fee;

      addOperation({
        type: 'withdrawal',
        status: 'success',
        data: withdrawal,
        message: `✓ Retiro solicitado. ID: ${withdrawal.withdrawalId}`,
      });

      // Completar flujo
      flow.status = 'completed';
      flow.completedAt = new Date().toISOString();

    } catch (error: any) {
      flow.status = 'failed';
      flow.error = error.message;
      flow.completedAt = new Date().toISOString();

      addOperation({
        type: 'withdrawal',
        status: 'failed',
        data: { error: error.message },
        message: `✗ Error: ${error.message}`,
      });
    }

    // Guardar flujo
    this.flows.unshift(flow);
    this.saveFlows();
    this.emit('flow:complete', flow);

    return flow;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-Execute on USD Deposit (WebSocket Triggered)
  // ─────────────────────────────────────────────────────────────────────────

  async setupAutoConversion(
    destAddress: string,
    network: NetworkType,
    onProgress?: (operation: FlowOperation) => void
  ): Promise<void> {
    // Connect WebSocket if not connected
    if (!this.isWebSocketConnected()) {
      await this.connectWebSocket();
    }

    // Subscribe to balance channel
    await this.subscribe(WS_CHANNELS.balance, true);

    // Listen for USD deposits
    this.on('usd:deposit', async (data: { amount: string; total: string }) => {
      console.log('[KuCoin] USD deposit detected:', data);
      
      this.addEvent({
        type: 'balance',
        status: 'success',
        data,
        message: `🔔 Depósito USD detectado: $${data.amount}`,
      });

      // Auto-execute conversion
      if (parseFloat(data.total) > 0) {
        await this.executeFiatToUSDTFlow(data.total, destAddress, network, onProgress);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test Connection
  // ─────────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; message: string; accounts?: KuCoinAccount[]; mode?: string }> {
    try {
      // Primero probar el proxy
      const proxyTest = await fetch('/api/kucoin/test');
      const proxyData = await proxyTest.json();
      
      console.log('[KuCoin] Proxy test:', proxyData);
      
      if (!proxyTest.ok) {
        return {
          success: false,
          message: 'Error conectando al proxy local',
        };
      }

      // Luego probar las cuentas
      const accounts = await this.getAccounts();
      return {
        success: true,
        message: `Conexión exitosa. ${accounts.length} cuentas encontradas.`,
        accounts,
        mode: proxyData.mode || 'UNKNOWN',
      };
    } catch (error: any) {
      console.error('[KuCoin] Test connection error:', error);
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
      };
    }
  }

  async testWebSocket(): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar que tenemos credenciales (o modo local)
      console.log('[KuCoin WS] Testing WebSocket connection...');
      
      await this.connectWebSocket();
      await this.subscribe(WS_CHANNELS.balance, true);
      
      return {
        success: true,
        message: 'WebSocket conectado y suscrito a balance',
      };
    } catch (error: any) {
      console.error('[KuCoin WS] Test error:', error);
      return {
        success: false,
        message: `Error WebSocket: ${error.message}`,
      };
    }
  }

  // Test rápido del proxy
  async testProxy(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await fetch('/api/kucoin/test');
      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: `Proxy online - Mode: ${data.mode}`,
          data,
        };
      }
      
      return {
        success: false,
        message: 'Proxy no disponible',
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error de proxy: ${error.message}`,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCIA SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const kucoinClient = new KuCoinClient();
