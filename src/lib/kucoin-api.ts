/**
 * KuCoin API Client
 * Implementación del flujo: Fiat USD → USDT → Withdrawal
 * 
 * Requisitos:
 * - API Key con permisos: General, Trade, Transfer/Withdrawal
 * - IP Whitelist configurado en KuCoin
 * - Saldo USD disponible en Main Account
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface KuCoinConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  isConfigured: boolean;
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
  type: 'transfer' | 'order' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
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
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  usdtReceived?: string;
  withdrawalId?: string;
  fee?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export type NetworkType = 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | 'MATIC' | 'ALGO';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const KUCOIN_API_BASE = 'https://api.kucoin.com';
const CONFIG_KEY = 'kucoin_config';
const FLOWS_KEY = 'kucoin_flows';

export const SUPPORTED_NETWORKS: { id: NetworkType; name: string; fee: string }[] = [
  { id: 'TRC20', name: 'Tron (TRC20)', fee: '~1 USDT' },
  { id: 'ERC20', name: 'Ethereum (ERC20)', fee: '~5-20 USDT' },
  { id: 'BEP20', name: 'BNB Smart Chain (BEP20)', fee: '~0.8 USDT' },
  { id: 'SOL', name: 'Solana', fee: '~1 USDT' },
  { id: 'MATIC', name: 'Polygon', fee: '~1 USDT' },
  { id: 'ALGO', name: 'Algorand', fee: '~0.1 USDT' },
];

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

  constructor() {
    this.config = this.loadConfig();
    this.flows = this.loadFlows();
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
    };
  }

  private saveConfig(): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  getConfig(): KuCoinConfig {
    return { ...this.config };
  }

  setConfig(apiKey: string, apiSecret: string, passphrase: string): void {
    this.config = {
      apiKey,
      apiSecret,
      passphrase,
      isConfigured: !!(apiKey && apiSecret && passphrase),
    };
    this.saveConfig();
  }

  isConfigured(): boolean {
    return this.config.isConfigured;
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
  // API Requests
  // ─────────────────────────────────────────────────────────────────────────

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
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

    // Usar proxy local para evitar CORS
    const proxyUrl = '/api/kucoin' + endpoint;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'KC-API-KEY': this.config.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': encryptedPassphrase,
      'KC-API-KEY-VERSION': '2',
    };

    const response = await fetch(proxyUrl, {
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
  // Account Methods
  // ─────────────────────────────────────────────────────────────────────────

  async getAccounts(currency?: string, accountType?: string): Promise<KuCoinAccount[]> {
    let endpoint = '/api/v1/accounts';
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
    
    const result = await this.makeRequest('POST', '/api/v2/accounts/inner-transfer', {
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

    const result = await this.makeRequest('POST', '/api/v1/orders', body);

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
    return await this.makeRequest('GET', `/api/v1/orders/${orderId}`);
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

    const result = await this.makeRequest('POST', '/api/v1/withdrawals', body);

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
    let endpoint = `/api/v1/withdrawals/quotas?currency=${currency}`;
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
        type: 'transfer',
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

    return flow;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test Connection
  // ─────────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; message: string; accounts?: KuCoinAccount[] }> {
    try {
      const accounts = await this.getAccounts();
      return {
        success: true,
        message: `Conexión exitosa. ${accounts.length} cuentas encontradas.`,
        accounts,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error de conexión: ${error.message}`,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCIA SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const kucoinClient = new KuCoinClient();

