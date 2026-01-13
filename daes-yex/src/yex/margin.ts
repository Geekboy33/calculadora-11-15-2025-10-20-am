import type { YexResult, SymbolName } from "../types.js";
import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}




import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}



import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

export interface MarginOrderRequest {
  symbol: SymbolName;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  quantity?: string;
  price?: string;
  newClientOrderId?: string; // idempotencia DAES
  isIsolated?: boolean;      // true = isolated margin, false = cross margin
}

export interface MarginOrderResponse {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  transactTime: number;
  isIsolated: boolean;
  [k: string]: any;
}

export interface MarginAccountInfo {
  borrowEnabled: boolean;
  marginLevel: string;
  totalAssetOfBtc: string;
  totalLiabilityOfBtc: string;
  totalNetAssetOfBtc: string;
  tradeEnabled: boolean;
  transferEnabled: boolean;
  userAssets: MarginAsset[];
}

export interface MarginAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface MarginLoanRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

export interface MarginRepayRequest {
  asset: string;
  amount: string;
  isIsolated?: boolean;
  symbol?: string; // Required for isolated margin
}

// ============================================================================
// Margin Client
// ============================================================================

export class YexMargin {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // TRADE ENDPOINTS
  // ==========================================================================

  /**
   * Place a new margin order
   * @param req Order request parameters
   */
  newOrder(req: MarginOrderRequest): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/order", "TRADE", undefined, req);
  }

  /**
   * Cancel a margin order
   * @param symbol Trading pair
   * @param orderId Order ID (optional if origClientOrderId provided)
   * @param origClientOrderId Client order ID (optional if orderId provided)
   */
  cancel(
    symbol: SymbolName,
    orderId?: string,
    origClientOrderId?: string
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("POST", "/sapi/v1/margin/cancel", "TRADE", undefined, {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * Get all open margin orders
   * @param symbol Optional trading pair
   * @param isIsolated Whether to query isolated margin orders
   */
  openOrders(
    symbol?: SymbolName,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/openOrders", "TRADE", {
      symbol,
      isIsolated,
    });
  }

  /**
   * Query margin order status
   * @param symbol Trading pair
   * @param orderId Order ID
   * @param isIsolated Whether isolated margin
   */
  queryOrder(
    symbol: SymbolName,
    orderId: string,
    isIsolated?: boolean
  ): Promise<YexResult<MarginOrderResponse>> {
    return this.c.call("GET", "/sapi/v1/margin/order", "TRADE", {
      symbol,
      orderId,
      isIsolated,
    });
  }

  /**
   * Get margin order history
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
  ): Promise<YexResult<MarginOrderResponse[]>> {
    return this.c.call("GET", "/sapi/v1/margin/historyOrders", "TRADE", {
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
   * Get margin account information
   */
  account(): Promise<YexResult<MarginAccountInfo>> {
    return this.c.call("GET", "/sapi/v1/margin/account", "USER_DATA");
  }

  /**
   * Get max borrowable amount
   * @param asset Asset to borrow
   * @param isIsolated Whether isolated margin
   * @param symbol Required for isolated margin
   */
  maxBorrowable(
    asset: string,
    isIsolated?: boolean,
    symbol?: string
  ): Promise<YexResult<{ amount: string }>> {
    return this.c.call("GET", "/sapi/v1/margin/maxBorrowable", "USER_DATA", {
      asset,
      isIsolated,
      symbol,
    });
  }

  // ==========================================================================
  // LOAN ENDPOINTS
  // ==========================================================================

  /**
   * Borrow margin loan
   * @param req Loan request parameters
   */
  loan(req: MarginLoanRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/loan", "TRADE", undefined, req);
  }

  /**
   * Repay margin loan
   * @param req Repay request parameters
   */
  repay(req: MarginRepayRequest): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/repay", "TRADE", undefined, req);
  }

  /**
   * Get loan history
   * @param asset Asset borrowed
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  loanHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/loan", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  /**
   * Get repay history
   * @param asset Asset repaid
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  repayHistory(
    asset: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/margin/repay", "USER_DATA", {
      asset,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Transfer between spot and margin accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param type 1 = spot to margin, 2 = margin to spot
   */
  transfer(
    asset: string,
    amount: string,
    type: 1 | 2
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/margin/transfer", "TRADE", undefined, {
      asset,
      amount,
      type,
    });
  }
}





