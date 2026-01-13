/**
 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}

 * Mint Event Listener
 * 
 * Listens to BridgeMinter Minted events via WebSocket
 * and updates hold status accordingly.
 */

import { ethers } from "ethers";
import { wssProvider } from "../web3/provider";
import { BridgeMinterAbi } from "../web3/bridgeMinterAbi";

const BRIDGE = process.env.BRIDGE_MINTER_ADDRESS!;
const API_BASE = process.env.API_BASE || "http://localhost:3000";

let isListening = false;

/**
 * Start listening for Minted events
 */
export function startMintListener(): void {
  if (isListening) {
    console.log("[MintListener] Already listening");
    return;
  }

  try {
    const bridge = new ethers.Contract(BRIDGE, BridgeMinterAbi, wssProvider);

    bridge.on("Minted", async (
      daesRef: string, 
      holdId: string, 
      amount: bigint, 
      beneficiary: string, 
      event: any
    ) => {
      const txHash = event.log?.transactionHash || event.transactionHash || "";
      
      console.log("=".repeat(60));
      console.log("[MintListener] 🎉 Minted Event Received!");
      console.log(`  daesRef (bytes32): ${daesRef}`);
      console.log(`  holdId (bytes32): ${holdId}`);
      console.log(`  amount: ${amount.toString()} (${Number(amount) / 1e6} dUSD)`);
      console.log(`  beneficiary: ${beneficiary}`);
      console.log(`  tx_hash: ${txHash}`);
      console.log("=".repeat(60));

      // Note: The daesRef here is already hashed (bytes32), 
      // so we can't directly map it back to the original string.
      // In production, you'd need to store the hash->original mapping
      // or emit the original string in the event.
      
      // For now, we just log. The actual capture happens in /mint/execute
    });

    // Handle WebSocket close
    wssProvider.websocket?.on?.("close", () => {
      console.log("[MintListener] WebSocket closed, will attempt reconnect...");
      isListening = false;
      // Attempt reconnect after 5 seconds
      setTimeout(() => startMintListener(), 5000);
    });

    wssProvider.websocket?.on?.("error", (error: any) => {
      console.error("[MintListener] WebSocket error:", error.message);
    });

    isListening = true;
    console.log(`[MintListener] ✅ Listening for Minted events on ${BRIDGE}`);
    
  } catch (error) {
    console.error("[MintListener] Failed to start:", error);
    isListening = false;
    // Retry after 10 seconds
    setTimeout(() => startMintListener(), 10000);
  }
}

/**
 * Stop listening
 */
export function stopMintListener(): void {
  if (!isListening) return;
  
  try {
    wssProvider.websocket?.close?.();
    isListening = false;
    console.log("[MintListener] Stopped");
  } catch (error) {
    console.error("[MintListener] Error stopping:", error);
  }
}

/**
 * Check if listener is active
 */
export function isListenerActive(): boolean {
  return isListening;
}
















