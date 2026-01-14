import type { YexResult, SymbolName } from "../types.js";
import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface FuturesOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT" | "BOTH";
  type: "LIMIT" | "MARKET" | "STOP" | "STOP_MARKET" | "TAKE_PROFIT" | "TAKE_PROFIT_MARKET";
  quantity?: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  closePosition?: boolean;
  clientOrderId?: string; // idempotencia DAES
}

export interface FuturesConditionOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type?: string;
  quantity?: string;
  price?: string;
  stopPrice?: string;
  clientOrderId?: string;
}

export interface FuturesOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  stopPrice?: string;
  updateTime: number;
  [k: string]: any;
}

export interface FuturesPositionResponse {
  symbol: string;
  positionSide: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  [k: string]: any;
}

export interface FuturesAccountInfo {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  positions: FuturesPositionResponse[];
  assets: FuturesAsset[];
}

export interface FuturesAsset {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  [k: string]: any;
}

export interface FuturesIndexResponse {
  symbol: string;
  indexPrice: string;
  time: number;
}

export interface FuturesKlineResponse {
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
// Futures Client
// ============================================================================

export class YexFutures {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  /**
   * Test connectivity to futures API
   */
  ping(): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ping", "NONE");
  }

  /**
   * Get server time
   */
  time(): Promise<YexResult<{ serverTime: number }>> {
    return this.c.call("GET", "/fapi/v1/time", "NONE");
  }

  /**
   * Get index price
   * @param symbol Optional trading pair
   */
  index(symbol?: SymbolName): Promise<YexResult<FuturesIndexResponse | FuturesIndexResponse[]>> {
    return this.c.call("GET", "/fapi/v1/index", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get mark price
   * @param symbol Optional trading pair
   */
  markPrice(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/premiumIndex", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get funding rate
   * @param symbol Trading pair
   */
  fundingRate(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/fundingRate", "NONE", { symbol });
  }

  /**
   * Get kline/candlestick data
   * @param symbol Trading pair
   * @param interval Kline interval
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of klines
   */
  klines(
    symbol: SymbolName,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesKlineResponse[]>> {
    return this.c.call("GET", "/fapi/v1/klines", "NONE", {
      symbol,
      interval,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get 24h ticker
   * @param symbol Optional trading pair
   */
  ticker(symbol?: SymbolName): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/ticker/24hr", "NONE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order book depth
   * @param symbol Trading pair
   * @param limit Number of levels
   */
  depth(symbol: SymbolName, limit?: number): Promise<YexResult<any>> {
    return this.c.call("GET", "/fapi/v1/depth", "NONE", { symbol, limit });
  }

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new futures order
   * @param req Order request parameters
   */
  newOrder(req: FuturesOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/order", "TRADE", undefined, req);
  }

  /**
   * Place a condition order (stop-loss, take-profit)
   * @param req Condition order request
   */
  conditionOrder(req: FuturesConditionOrderRequest): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/conditionOrder", "TRADE", undefined, req);
  }

  /**
   * Cancel a futures order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if clientOrderId provided)
   * @param clientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    clientOrderId?: string
  ): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("POST", "/fapi/v1/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      clientOrderId,
    });
  }

  /**
   * Cancel all open orders for a symbol
   * @param symbol Trading pair
   */
  cancelAll(symbol: SymbolName): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/allOpenOrders", "TRADE", undefined, { symbol });
  }

  /**
   * Query order status
   * @param symbol Trading pair
   * @param orderId Order ID
   */
  queryOrder(symbol: SymbolName, orderId: string): Promise<YexResult<FuturesOrderResponse>> {
    return this.c.call("GET", "/fapi/v1/order", "TRADE", { symbol, orderId });
  }

  /**
   * Get all open orders
   * @param symbol Optional trading pair
   */
  openOrders(symbol?: SymbolName): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/openOrders", "TRADE", symbol ? { symbol } : undefined);
  }

  /**
   * Get order history
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of orders
   */
  orderHistory(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<FuturesOrderResponse[]>> {
    return this.c.call("GET", "/fapi/v1/historyOrders", "TRADE", {
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
   * Get futures account information
   */
  account(): Promise<YexResult<FuturesAccountInfo>> {
    return this.c.call("GET", "/fapi/v1/account", "USER_DATA");
  }

  /**
   * Get account balance
   */
  balance(): Promise<YexResult<FuturesAsset[]>> {
    return this.c.call("GET", "/fapi/v1/balance", "USER_DATA");
  }

  /**
   * Get position information
   * @param symbol Optional trading pair
   */
  positionRisk(symbol?: SymbolName): Promise<YexResult<FuturesPositionResponse[]>> {
    return this.c.call("GET", "/fapi/v1/positionRisk", "USER_DATA", symbol ? { symbol } : undefined);
  }

  /**
   * Get account trades
   * @param symbol Trading pair
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of trades
   */
  userTrades(
    symbol: SymbolName,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/fapi/v1/userTrades", "USER_DATA", {
      symbol,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // POSITION MANAGEMENT
  // ==========================================================================

  /**
   * Change leverage
   * @param symbol Trading pair
   * @param leverage Leverage value (1-125)
   */
  setLeverage(symbol: SymbolName, leverage: number): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/leverage", "TRADE", undefined, {
      symbol,
      leverage,
    });
  }

  /**
   * Change margin type
   * @param symbol Trading pair
   * @param marginType ISOLATED or CROSSED
   */
  setMarginType(
    symbol: SymbolName,
    marginType: "ISOLATED" | "CROSSED"
  ): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/marginType", "TRADE", undefined, {
      symbol,
      marginType,
    });
  }

  /**
   * Change position mode
   * @param dualSidePosition true = Hedge Mode, false = One-way Mode
   */
  setPositionMode(dualSidePosition: boolean): Promise<YexResult<any>> {
    return this.c.call("POST", "/fapi/v1/positionSide/dual", "TRADE", undefined, {
      dualSidePosition,
    });
  }

  /**
   * Get current position mode
   */
  getPositionMode(): Promise<YexResult<{ dualSidePosition: boolean }>> {
    return this.c.call("GET", "/fapi/v1/positionSide/dual", "USER_DATA");
  }
}






