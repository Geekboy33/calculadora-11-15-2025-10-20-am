import type { YexResult } from "../types.js";
import { YexRestClient } from "./yexRestClient.js";

// ============================================================================
// Types
// ============================================================================

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
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

/**
 * YEX usa "RealCoinName" por red (Appendix 1 de docs).
 * Ejemplos: USDTBSC, TUSDT, EUSDT... (depende del exchange).
 */
export interface WithdrawApplyRequest {
  coin: string;              // RealCoinName (e.g., USDTBSC, EUSDT, TUSDT)
  address: string;           // Wallet address
  amount: string;            // Amount to withdraw
  memo?: string;             // Tag/memo if required (e.g., for XRP, EOS)
  network?: string;          // Network if YEX uses explicit network param
  clientWithdrawId?: string; // Idempotencia DAES
}

export interface WithdrawResponse {
  id: string;
  withdrawId?: string;
  coin: string;
  amount: string;
  address: string;
  memo?: string;
  status: string;
  txId?: string;
  applyTime: number;
  [k: string]: any;
}

export interface WithdrawQueryParams {
  coin?: string;
  withdrawId?: string;
  status?: number;      // 0=pending, 1=success, 2=cancelled, 3=failed
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface DepositAddress {
  coin: string;
  address: string;
  memo?: string;
  network: string;
  [k: string]: any;
}

export interface DepositHistory {
  id: string;
  coin: string;
  amount: string;
  address: string;
  txId: string;
  status: number;
  insertTime: number;
  [k: string]: any;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
  [k: string]: any;
}

export interface NetworkInfo {
  network: string;
  coin: string;           // RealCoinName
  withdrawEnable: boolean;
  depositEnable: boolean;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  [k: string]: any;
}

// ============================================================================
// Withdraw Client
// ============================================================================

export class YexWithdraw {
  constructor(private c: YexRestClient) {}

  // ==========================================================================
  // WITHDRAW ENDPOINTS
  // ==========================================================================

  /**
   * Apply for a withdrawal
   * @param req Withdrawal request parameters
   */
  apply(req: WithdrawApplyRequest): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("POST", "/sapi/v1/withdraw/apply", "USER_DATA", undefined, req);
  }

  /**
   * Query withdrawal history
   * @param params Query parameters
   */
  query(params?: WithdrawQueryParams): Promise<YexResult<WithdrawResponse[]>> {
    return this.c.call("POST", "/sapi/v1/withdraw/query", "USER_DATA", undefined, params ?? {});
  }

  /**
   * Get withdrawal by ID
   * @param withdrawId Withdrawal ID
   */
  getById(withdrawId: string): Promise<YexResult<WithdrawResponse>> {
    return this.c.call("GET", "/sapi/v1/withdraw", "USER_DATA", { withdrawId });
  }

  // ==========================================================================
  // DEPOSIT ENDPOINTS
  // ==========================================================================

  /**
   * Get deposit address for a coin
   * @param coin Coin symbol (e.g., BTC, ETH, USDT)
   * @param network Network (optional, e.g., ERC20, TRC20, BEP20)
   */
  depositAddress(coin: string, network?: string): Promise<YexResult<DepositAddress>> {
    return this.c.call("GET", "/sapi/v1/deposit/address", "USER_DATA", { coin, network });
  }

  /**
   * Get deposit history
   * @param coin Optional coin filter
   * @param status Optional status filter (0=pending, 1=success)
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  depositHistory(
    coin?: string,
    status?: number,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<DepositHistory[]>> {
    return this.c.call("GET", "/sapi/v1/deposit/history", "USER_DATA", {
      coin,
      status,
      startTime,
      endTime,
      limit,
    });
  }

  // ==========================================================================
  // COIN INFO ENDPOINTS
  // ==========================================================================

  /**
   * Get all coins information including networks
   */
  allCoins(): Promise<YexResult<CoinInfo[]>> {
    return this.c.call("GET", "/sapi/v1/capital/config/getall", "USER_DATA");
  }

  /**
   * Get coin info by symbol
   * @param coin Coin symbol
   */
  coinInfo(coin: string): Promise<YexResult<CoinInfo>> {
    return this.c.call("GET", "/sapi/v1/capital/config", "USER_DATA", { coin });
  }

  // ==========================================================================
  // TRANSFER ENDPOINTS
  // ==========================================================================

  /**
   * Internal transfer between accounts
   * @param asset Asset to transfer
   * @param amount Amount to transfer
   * @param fromAccount Source account type
   * @param toAccount Destination account type
   */
  internalTransfer(
    asset: string,
    amount: string,
    fromAccount: "SPOT" | "MARGIN" | "FUTURES",
    toAccount: "SPOT" | "MARGIN" | "FUTURES"
  ): Promise<YexResult<{ tranId: string }>> {
    return this.c.call("POST", "/sapi/v1/asset/transfer", "USER_DATA", undefined, {
      asset,
      amount,
      fromAccount,
      toAccount,
    });
  }

  /**
   * Get internal transfer history
   * @param type Transfer type
   * @param startTime Start time in milliseconds
   * @param endTime End time in milliseconds
   * @param limit Number of records
   */
  transferHistory(
    type?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<YexResult<any[]>> {
    return this.c.call("GET", "/sapi/v1/asset/transfer", "USER_DATA", {
      type,
      startTime,
      endTime,
      limit,
    });
  }
}





