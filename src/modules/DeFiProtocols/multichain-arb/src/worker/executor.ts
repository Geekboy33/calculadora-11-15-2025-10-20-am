// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}




// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//
// Handles the actual execution of arbitrage trades on-chain
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, Wallet, JsonRpcProvider, TransactionResponse, TransactionReceipt } from "ethers";
import { CFG, ChainKey, CHAIN_INFO } from "../config.js";
import { encodeV3Path } from "../dex/univ3.js";
import { Candidate } from "./strategy.js";
import { logExecutor } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CONTRACT ABI
// ─────────────────────────────────────────────────────────────────────────────────

const EXECUTOR_ABI = [
  "function execute(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function executeWithCallback(bytes path1, bytes path2, uint256 amountIn, uint256 minOut, uint256 deadline) external returns (uint256 amountOut)",
  "function withdraw(address token, uint256 amount) external",
  "function owner() external view returns (address)"
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class Executor {
  private wallet: Wallet;
  private chain: ChainKey;
  private executorAddress: string | null = null;

  constructor(chain: ChainKey, provider: JsonRpcProvider) {
    this.chain = chain;
    this.wallet = new Wallet(CFG.PRIVATE_KEY, provider);
  }

  /**
   * Set the executor contract address
   */
  setExecutorAddress(address: string): void {
    this.executorAddress = address;
    logExecutor.info({ chain: this.chain, executor: address }, "Executor address set");
  }

  /**
   * Get the wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Execute an arbitrage trade
   */
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    const { route, amountIn, amountOut } = candidate;

    logExecutor.info({
      chain: this.chain,
      route: route.name,
      amountIn: amountIn.toString(),
      expectedOut: amountOut.toString()
    }, "Executing arbitrage");

    try {
      // Build paths
      const path1 = encodeV3Path([route.tokenIn, route.tokenMid], [route.fee1]);
      const path2 = encodeV3Path([route.tokenMid, route.tokenOut], [route.fee2]);

      // Calculate minimum output with slippage
      const slippageBps = BigInt(CFG.MAX_SLIPPAGE_BPS);
      const minOut = amountOut - (amountOut * slippageBps / 10000n);

      // Deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + CFG.DEADLINE_SECONDS);

      // Get gas price
      const feeData = await this.wallet.provider!.getFeeData();
      const gasPrice = feeData.gasPrice ?? 0n;

      // Create contract instance
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);

      // Estimate gas first
      let gasLimit: bigint;
      try {
        gasLimit = await executor.execute.estimateGas(path1, path2, amountIn, minOut, deadline);
        gasLimit = gasLimit * 120n / 100n; // Add 20% buffer
      } catch (estimateError: any) {
        logExecutor.warn({ error: estimateError.message }, "Gas estimation failed, using default");
        gasLimit = 500000n;
      }

      // Execute transaction
      const tx: TransactionResponse = await executor.execute(
        path1,
        path2,
        amountIn,
        minOut,
        deadline,
        {
          gasLimit,
          gasPrice: gasPrice * 110n / 100n // 10% gas price boost
        }
      );

      logExecutor.info({
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }, "Transaction sent");

      // Wait for confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        return {
          success: false,
          txHash: tx.hash,
          error: "Transaction reverted"
        };
      }

      logExecutor.info({
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      }, "Transaction confirmed");

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        receipt
      };

    } catch (error: any) {
      logExecutor.error({
        chain: this.chain,
        route: route.name,
        error: error.message
      }, "Execution failed");

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureApproval(tokenAddress: string, spender: string, amount: bigint): Promise<boolean> {
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, this.wallet);
      const allowance = await token.allowance(this.wallet.address, spender);

      if (BigInt(allowance) >= amount) {
        return true;
      }

      logExecutor.info({
        token: tokenAddress,
        spender,
        amount: amount.toString()
      }, "Approving token");

      const tx = await token.approve(spender, amount);
      await tx.wait(1);

      logExecutor.info({ txHash: tx.hash }, "Approval confirmed");
      return true;

    } catch (error: any) {
      logExecutor.error({ error: error.message }, "Approval failed");
      return false;
    }
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<bigint> {
    const token = new Contract(tokenAddress, ERC20_ABI, this.wallet.provider!);
    return BigInt(await token.balanceOf(this.wallet.address));
  }

  /**
   * Get native token balance (ETH/MATIC)
   */
  async getNativeBalance(): Promise<bigint> {
    return await this.wallet.provider!.getBalance(this.wallet.address);
  }

  /**
   * Withdraw tokens from executor contract
   */
  async withdrawFromExecutor(tokenAddress: string, amount: bigint): Promise<ExecutionResult> {
    if (!this.executorAddress) {
      return { success: false, error: "Executor address not set" };
    }

    try {
      const executor = new Contract(this.executorAddress, EXECUTOR_ABI, this.wallet);
      const tx = await executor.withdraw(tokenAddress, amount);
      const receipt = await tx.wait(1);

      return {
        success: receipt?.status === 1,
        txHash: tx.hash,
        receipt: receipt ?? undefined
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    return `${CHAIN_INFO[this.chain].blockExplorer}/tx/${txHash}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// DRY RUN EXECUTOR (for testing)
// ─────────────────────────────────────────────────────────────────────────────────

export class DryRunExecutor extends Executor {
  async executeArbitrage(candidate: Candidate): Promise<ExecutionResult> {
    logExecutor.info({
      chain: this.getWalletAddress(),
      route: candidate.route.name,
      amountIn: candidate.amountIn.toString(),
      expectedProfit: candidate.profitNetUsd.toFixed(4),
      mode: "DRY_RUN"
    }, "Would execute arbitrage");

    // Simulate success
    return {
      success: true,
      txHash: `0x${"0".repeat(64)}`,
      blockNumber: 0,
      gasUsed: candidate.gasEstimate
    };
  }
}

