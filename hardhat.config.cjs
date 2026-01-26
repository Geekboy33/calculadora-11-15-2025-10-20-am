require("dotenv").config();

const LEMON_ADMIN_KEY = "1e8bb938bfa9045372da91cfb2c46672604c65bb04ef1e27666c54ce4f84d080";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "paris"
        }
      }
    ]
  },
  networks: {
    lemonchain: {
      type: "http",
      url: "https://rpc.lemonchain.io",
      accounts: [LEMON_ADMIN_KEY],
      chainId: 1006
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
