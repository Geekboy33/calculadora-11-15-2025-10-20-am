import type { YexResult, SymbolName } from "../types.js";
import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface SpotSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  [k: string]: any;
}

export interface SpotOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET" | "IOC" | "FOK";
  quantity?: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  newClientOrderId?: string; // idempotencia DAES
}

export interface SpotOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  [k: string]: any;
}

export interface SpotTickerResponse {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
  [k: string]: any;
}

export interface SpotDepthResponse {
  bids: [string, string][]; // [price, quantity][]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface SpotTradeResponse {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface SpotKlineResponse {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  [k: string]: any;
}

// ============================================================================
// Spot Client
// ============================================================================

export class YexSpot {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ==========================================================================

  /**
   * Test connectivity to the API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/sapi/v1/time", "NONE");
  }

  /**
   * Get all trading symbols
   */
  symbols(): Promise<YexResult<SpotSymbolInfo[]>> {
    return this.c.call("GET", "/sapi/v1/symbols", "NONE");
  }

  /**
   * Get order book depth
   * @param symbol Trading pair (e.g., BTCUSDT)
   * @param limit Number of levels (default: 100, max: 1000)
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<SpotDepthResponse>> {
    return this.c.call("GET", "/sapi/v1/depth", "NONE", { symbol, limit });
  }

  /**
   * Get 24h ticker price change statistics
   * @param symbol Optional trading pair. If omitted, returns all tickers
   */
  ticker(symbol?: SymbolName): Promise<YexResult<SpotTickerResponse | SpotTickerResponse[]>> {
    return this.c.call("GET", "/sapi/v1/ticker", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get recent trades
   * @param symbol Trading pair
   * @param limit Number of trades (default: 500, max: 1000)
   */
  trades(symbol: SymbolName, limit?: number): Promise<YexResult<SpotTradeResponse[]>> {
    return this.c.call("GET", "/sapi/v1/trades", "NONE", { symbol, limit });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval (1min, 5min, 15min, 30min, 1h, 4h, 1d, 1w, 1M)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines (default: 500, max: 1000)
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotKlineResponse[]>> {
    return this.c.call("GET", "/sapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRADE ENDPOINTS (Authentication required)
  // ==========================================================================

  /**
   * Place a new order
   * @param req Order request parameters
   */
  newOrder(req: SpotOrderRequest): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Test new order (does not actually place order)
   * @param req Order request parameters
   */
  testOrder(req: SpotOrderRequest): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/order/test", "TRADE", undefined, req);
  }

  /**
   * Place multiple orders at once
   * @param orders Array of order requests
   */
  batchOrders(orders: SpotOrderRequest[]): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("POST", "/sapi/v1/batchOrders", "TRADE", undefined, { orders });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  queryOrder(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/order", "TRADE", {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel an order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<SpotOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Cancel multiple orders
   * @param symbol Trading pair
   * @param orderIds Array of order IDs to cancel
   */
  batchCancel(symbol: SymbolName, orderIds: string[]): Promise<YexResult<any>> {
    return this.c.call("POST", "/sapi/v1/batchCancel", "TRADE", undefined, {
      symbol,
      orderIds,
    });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair. If omitted, returns all open orders
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders (default: 500)
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<SpotOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/historyOrders", "TRADE", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // ACCOUNT ENDPOINTS
  // ==========================================================================

  /**
   * Get account information and balances
   */
  account(): Promise<YexResult<any>> {
    return this.c.call("GET", "/sapi/v1/account", "USER_DATA");
  }

  /**
   * Get account trade list
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades (default: 500)
   */
  myTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/myTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }
}






