// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - UNISWAP V3 INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}




// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}


// ═══════════════════════════════════════════════════════════════════════════════

import { Contract, JsonRpcProvider } from "ethers";
import { logDEX } from "../logger.js";

// ─────────────────────────────────────────────────────────────────────────────────
// UNISWAP V3 ABIs
// ─────────────────────────────────────────────────────────────────────────────────

// QuoterV2 ABI (for getting quotes)
const QUOTER_V2_ABI = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI (for executing swaps)
const SWAP_ROUTER_ABI = [
  "function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)"
];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

// ─────────────────────────────────────────────────────────────────────────────────
// PATH ENCODING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode a multi-hop path for Uniswap V3
 * Format: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + fee (3 bytes) + token2 (20 bytes)...
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error(`Invalid path: ${tokens.length} tokens require ${tokens.length - 1} fees, got ${fees.length}`);
  }

  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    // Add token address (20 bytes, without 0x prefix)
    path += tokens[i].slice(2).toLowerCase();
    // Add fee (3 bytes, padded)
    path += fees[i].toString(16).padStart(6, "0");
  }
  // Add final token
  path += tokens[tokens.length - 1].slice(2).toLowerCase();

  return path;
}

/**
 * Decode a V3 path back to tokens and fees
 */
export function decodeV3Path(path: string): { tokens: string[]; fees: number[] } {
  const data = path.startsWith("0x") ? path.slice(2) : path;
  const tokens: string[] = [];
  const fees: number[] = [];

  let offset = 0;
  while (offset < data.length) {
    // Read token (20 bytes = 40 hex chars)
    tokens.push("0x" + data.slice(offset, offset + 40));
    offset += 40;

    // Read fee if not at end (3 bytes = 6 hex chars)
    if (offset < data.length) {
      fees.push(parseInt(data.slice(offset, offset + 6), 16));
      offset += 6;
    }
  }

  return { tokens, fees };
}

// ─────────────────────────────────────────────────────────────────────────────────
// QUOTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a QuoterV2 contract instance
 */
export function quoter(provider: JsonRpcProvider, quoterAddr: string): Contract {
  return new Contract(quoterAddr, QUOTER_V2_ABI, provider);
}

/**
 * Get a quote for an exact input swap
 */
export async function quoteExactInput(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokens: string[];
  fees: number[];
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);
  const path = encodeV3Path(params.tokens, params.fees);

  try {
    const result = await q.quoteExactInput.staticCall(path, params.amountIn);
    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokens: params.tokens,
      fees: params.fees,
      amountIn: params.amountIn.toString(),
      error: error.message
    }, "Quote failed");
    throw error;
  }
}

/**
 * Get a quote for a single-hop swap
 */
export async function quoteExactInputSingle(params: {
  provider: JsonRpcProvider;
  quoterV2: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
  amountIn: bigint;
}): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
  const q = quoter(params.provider, params.quoterV2);

  try {
    const result = await q.quoteExactInputSingle.staticCall({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      fee: params.fee,
      sqrtPriceLimitX96: 0n
    });

    return {
      amountOut: BigInt(result[0]),
      gasEstimate: BigInt(result[3])
    };
  } catch (error: any) {
    logDEX.error({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      fee: params.fee,
      error: error.message
    }, "Single quote failed");
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// ROUTER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a SwapRouter contract instance
 */
export function router(provider: JsonRpcProvider, routerAddr: string): Contract {
  return new Contract(routerAddr, SWAP_ROUTER_ABI, provider);
}

/**
 * Build calldata for exactInput swap
 */
export function buildExactInputCalldata(params: {
  path: string;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): string {
  const iface = new Contract("0x0000000000000000000000000000000000000000", SWAP_ROUTER_ABI).interface;
  return iface.encodeFunctionData("exactInput", [{
    path: params.path,
    recipient: params.recipient,
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum
  }]);
}

// ─────────────────────────────────────────────────────────────────────────────────
// TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  provider: JsonRpcProvider,
  tokenAddress: string
): Promise<number> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return Number(await token.decimals());
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  account: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.balanceOf(account));
}

/**
 * Check and get allowance
 */
export async function getTokenAllowance(
  provider: JsonRpcProvider,
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  return BigInt(await token.allowance(owner, spender));
}

