/**
 * Ethereum Provider Configuration
 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};

 * Connects to Arbitrum via Alchemy RPC
 */

import { ethers } from "ethers";

const chainId = Number(process.env.ARBITRUM_CHAIN_ID || 42161);

// HTTP Provider for transactions (required)
export const httpProvider = new ethers.JsonRpcProvider(
  process.env.ARBITRUM_RPC_HTTPS!,
  chainId
);

// WebSocket Provider for event listening (optional - only if valid URL)
let _wssProvider: ethers.WebSocketProvider | null = null;

export function getWssProvider(): ethers.WebSocketProvider | null {
  if (_wssProvider) return _wssProvider;
  
  const wssUrl = process.env.ARBITRUM_RPC_WSS;
  if (!wssUrl || wssUrl.includes("YOUR_NEW_KEY")) {
    console.log("[Provider] WSS not configured - event listening disabled");
    return null;
  }
  
  try {
    _wssProvider = new ethers.WebSocketProvider(wssUrl, chainId);
    console.log("[Provider] WSS connected");
    return _wssProvider;
  } catch (e) {
    console.warn("[Provider] WSS connection failed:", e);
    return null;
  }
}

// Legacy export for compatibility (lazy initialization)
export const wssProvider = {
  get instance() {
    return getWssProvider();
  }
};
