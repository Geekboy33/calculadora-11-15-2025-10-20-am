// Hardhat 3.x configuration for Flash Loan Arbitrage Contracts
require('dotenv').config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    // Base Mainnet
    base: {
      type: "http",
      url: process.env.BASE_RPC_URL || "https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 8453
    },
    // Arbitrum Mainnet
    arbitrum: {
      type: "http",
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 42161
    },
    // Optimism Mainnet
    optimism: {
      type: "http",
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 10
    },
    // Polygon Mainnet
    polygon: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 137
    },
    // Sepolia Testnet
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    // Ethereum Mainnet
    mainnet: {
      type: "http",
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: process.env.VITE_ETH_PRIVATE_KEY ? [process.env.VITE_ETH_PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
