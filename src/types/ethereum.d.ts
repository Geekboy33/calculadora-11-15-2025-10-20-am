// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ETHEREUM WINDOW TYPE DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isWalletConnect?: boolean;
    
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    
    selectedAddress?: string;
    chainId?: string;
    networkVersion?: string;
    
    enable?: () => Promise<string[]>;
    send?: (method: string, params?: unknown[]) => Promise<unknown>;
  };
}
