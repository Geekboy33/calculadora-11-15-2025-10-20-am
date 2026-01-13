/**
 * ETH USD Provider
 * Ethereum Mainnet connection via Infura/Alchemy
 * Supports USDT Converter module
 */

import { ethers } from "ethers";
import { ETH_USD_CONFIG } from "./ethusd.config.js";

// HTTP Provider for transactions (required)
let _httpProvider: ethers.JsonRpcProvider | null = null;

export function getHttpProvider(): ethers.JsonRpcProvider {
  if (_httpProvider) return _httpProvider;

  if (!ETH_USD_CONFIG.rpcUrl) {
    throw new Error("[ETH USD] No RPC URL configured - set ETH_RPC_URL or INFURA_PROJECT_ID");
  }

  _httpProvider = new ethers.JsonRpcProvider(
    ETH_USD_CONFIG.rpcUrl,
    ETH_USD_CONFIG.chainId
  );

  console.log(`[ETH USD Provider] HTTP connected to chainId ${ETH_USD_CONFIG.chainId}`);
  console.log(`[ETH USD Provider] RPC URL: ${ETH_USD_CONFIG.rpcUrl.substring(0, 50)}...`);
  return _httpProvider;
}

// WebSocket Provider for event listening (optional)
let _wsProvider: ethers.WebSocketProvider | null = null;

export function getWsProvider(): ethers.WebSocketProvider | null {
  if (_wsProvider) return _wsProvider;

  const wsUrl = ETH_USD_CONFIG.wsUrl;
  if (!wsUrl || wsUrl.includes("<") || wsUrl.includes("YOUR")) {
    console.log("[ETH USD Provider] WSS not configured - event listening disabled");
    return null;
  }

  try {
    _wsProvider = new ethers.WebSocketProvider(wsUrl, ETH_USD_CONFIG.chainId);
    console.log("[ETH USD Provider] WSS connected");
    return _wsProvider;
  } catch (e) {
    console.warn("[ETH USD Provider] WSS connection failed:", e);
    return null;
  }
}

// Get private key from environment (multiple fallbacks)
function getPrivateKey(): string {
  const pk = process.env.ETH_OPERATOR_PRIVATE_KEY || 
             process.env.ETH_PRIVATE_KEY ||
             process.env.VITE_ETH_PRIVATE_KEY ||
             // Default from user config - USDT Converter module
             'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';
  
  return pk;
}

// DAES Signer (signs EIP-712 authorizations) - Optional for USDT transfers
let _daesSigner: ethers.Wallet | null = null;

export function getDaesSigner(): ethers.Wallet {
  if (_daesSigner) return _daesSigner;

  const pk = process.env.DAES_SIGNER_PRIVATE_KEY || getPrivateKey();
  
  _daesSigner = new ethers.Wallet(pk);
  console.log(`[ETH USD Provider] DAES Signer: ${_daesSigner.address}`);
  return _daesSigner;
}

// Operator (sends transactions, pays gas) - Required for USDT transfers
let _operator: ethers.Wallet | null = null;

export function getOperator(): ethers.Wallet {
  if (_operator) return _operator;

  const pk = getPrivateKey();
  
  _operator = new ethers.Wallet(pk, getHttpProvider());
  console.log(`[ETH USD Provider] Operator: ${_operator.address}`);
  return _operator;
}

/**
 * Check provider connection
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  blockNumber?: number;
  chainId?: number;
  error?: string;
}> {
  try {
    const provider = getHttpProvider();
    const [blockNumber, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getNetwork()
    ]);

    return {
      connected: true,
      blockNumber,
      chainId: Number(network.chainId)
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message
    };
  }
}

export default {
  getHttpProvider,
  getWsProvider,
  getDaesSigner,
  getOperator,
  checkConnection
};
