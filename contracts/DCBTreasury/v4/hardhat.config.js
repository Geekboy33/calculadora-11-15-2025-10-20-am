require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║  ⚙️  HARDHAT CONFIGURATION - DCB Treasury Smart Contracts v4.0                                                               ║
 * ║                                                                                                                              ║
 * ║  Network: LemonChain Mainnet (Chain ID: 8866)                                                                                ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,
      evmVersion: "paris"
    }
  },
  
  networks: {
    // LemonChain Mainnet
    lemonchain: {
      url: process.env.LEMONCHAIN_RPC_URL || "https://rpc.lemonchain.io",
      chainId: 8866,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000
    },
    
    // LemonChain Testnet (if available)
    lemonchain_testnet: {
      url: process.env.LEMONCHAIN_TESTNET_RPC_URL || "https://testnet-rpc.lemonchain.io",
      chainId: 8867,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000
    },
    
    // Local development
    hardhat: {
      chainId: 31337,
      forking: {
        url: process.env.LEMONCHAIN_RPC_URL || "https://rpc.lemonchain.io",
        enabled: false
      }
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  
  etherscan: {
    apiKey: {
      lemonchain: process.env.LEMONCHAIN_API_KEY || "no-api-key-needed"
    },
    customChains: [
      {
        network: "lemonchain",
        chainId: 8866,
        urls: {
          apiURL: "https://explorer.lemonchain.io/api",
          browserURL: "https://explorer.lemonchain.io"
        }
      }
    ]
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  mocha: {
    timeout: 120000
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 21
  }
};
