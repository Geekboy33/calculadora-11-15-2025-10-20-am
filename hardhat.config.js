import 'dotenv/config';

const LEMON_ADMIN_KEY = process.env.LEMON_ADMIN_KEY || "1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080";

export default {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "paris",
          viaIR: true
        }
      }
    ]
  },
  networks: {
    // LemonChain Mainnet
    lemonchain: {
      url: "https://rpc.lemonchain.io",
      accounts: [LEMON_ADMIN_KEY],
      chainId: 1005
    },
    // LemonChain Testnet
    "lemonchain-testnet": {
      url: "https://rpc.testnet.lemonchain.io",
      accounts: [LEMON_ADMIN_KEY],
      chainId: 1006,
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Hardhat network for testing
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 1000
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // Etherscan verification (if needed)
  etherscan: {
    apiKey: {
      lemonchain: "NOT_NEEDED",
      "lemonchain-testnet": "NOT_NEEDED"
    },
    customChains: [
      {
        network: "lemonchain",
        chainId: 1005,
        urls: {
          apiURL: "https://explorer.lemonchain.io/api",
          browserURL: "https://explorer.lemonchain.io"
        }
      },
      {
        network: "lemonchain-testnet",
        chainId: 1006,
        urls: {
          apiURL: "https://testnet.explorer.lemonchain.io/api",
          browserURL: "https://testnet.explorer.lemonchain.io"
        }
      }
    ]
  }
};
