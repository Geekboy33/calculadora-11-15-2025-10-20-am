import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("DAES ETH USD - Contract Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=".repeat(60));

  // Get addresses from env
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const DAES_SIGNER_ADDRESS = process.env.DAES_SIGNER_ADDRESS;

  if (!DAES_SIGNER_ADDRESS) {
    throw new Error("DAES_SIGNER_ADDRESS not set in .env");
  }

  console.log("\n📋 Configuration:");
  console.log("  Admin:", ADMIN_ADDRESS);
  console.log("  DAES Signer:", DAES_SIGNER_ADDRESS);

  // 1. Deploy USDToken
  console.log("\n🚀 Deploying USDToken...");
  const USDToken = await ethers.getContractFactory("USDToken");
  const usdToken = await USDToken.deploy(ADMIN_ADDRESS);
  await usdToken.waitForDeployment();
  const usdTokenAddress = await usdToken.getAddress();
  console.log("  ✅ USDToken deployed at:", usdTokenAddress);

  // 2. Deploy SettlementRegistry
  console.log("\n🚀 Deploying SettlementRegistry...");
  const SettlementRegistry = await ethers.getContractFactory("SettlementRegistry");
  const registry = await SettlementRegistry.deploy(ADMIN_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("  ✅ SettlementRegistry deployed at:", registryAddress);

  // 3. Deploy BridgeMinter
  console.log("\n🚀 Deploying BridgeMinter...");
  const BridgeMinter = await ethers.getContractFactory("BridgeMinter");
  const bridgeMinter = await BridgeMinter.deploy(usdTokenAddress, registryAddress, ADMIN_ADDRESS);
  await bridgeMinter.waitForDeployment();
  const bridgeMinterAddress = await bridgeMinter.getAddress();
  console.log("  ✅ BridgeMinter deployed at:", bridgeMinterAddress);

  // 4. Setup roles
  console.log("\n🔐 Setting up roles...");

  // Grant MINTER_ROLE to BridgeMinter on USDToken
  const MINTER_ROLE = await usdToken.MINTER_ROLE();
  let tx = await usdToken.grantRole(MINTER_ROLE, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ USDToken.MINTER_ROLE -> BridgeMinter");

  // Grant OPERATOR_ROLE to BridgeMinter on SettlementRegistry
  const OPERATOR_ROLE_REGISTRY = await registry.OPERATOR_ROLE();
  tx = await registry.grantRole(OPERATOR_ROLE_REGISTRY, bridgeMinterAddress);
  await tx.wait();
  console.log("  ✅ SettlementRegistry.OPERATOR_ROLE -> BridgeMinter");

  // Grant DAES_SIGNER_ROLE to DAES_SIGNER_ADDRESS on BridgeMinter
  const DAES_SIGNER_ROLE = await bridgeMinter.DAES_SIGNER_ROLE();
  tx = await bridgeMinter.grantRole(DAES_SIGNER_ROLE, DAES_SIGNER_ADDRESS);
  await tx.wait();
  console.log("  ✅ BridgeMinter.DAES_SIGNER_ROLE -> DAES_SIGNER");

  // Grant OPERATOR_ROLE to deployer on BridgeMinter (for testing)
  const OPERATOR_ROLE_MINTER = await bridgeMinter.OPERATOR_ROLE();
  tx = await bridgeMinter.grantRole(OPERATOR_ROLE_MINTER, deployer.address);
  await tx.wait();
  console.log("  ✅ BridgeMinter.OPERATOR_ROLE -> Deployer");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAdd these to your backend .env:");
  console.log(`\nETH_USD_TOKEN=${usdTokenAddress}`);
  console.log(`ETH_REGISTRY=${registryAddress}`);
  console.log(`ETH_BRIDGE_MINTER=${bridgeMinterAddress}`);
  console.log("\n" + "=".repeat(60));

  // Verify instructions
  console.log("\n📋 To verify contracts on Etherscan:");
  console.log(`\nnpx hardhat verify --network mainnet ${usdTokenAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${registryAddress} ${ADMIN_ADDRESS}`);
  console.log(`npx hardhat verify --network mainnet ${bridgeMinterAddress} ${usdTokenAddress} ${registryAddress} ${ADMIN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
















