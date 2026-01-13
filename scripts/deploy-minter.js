const hre = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy de USDTMinter...\n");

  // Obtener deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📍 Deployando desde: ${deployer.address}`);
  console.log(`💰 Balance: ${(await deployer.getBalance()).toString()} wei\n`);

  // Compilar contrato
  console.log("🔨 Compilando contrato...");
  const USDTMinter = await hre.ethers.getContractFactory("USDTMinter");
  
  // Deploy
  console.log("⏳ Deployando a blockchain...");
  
  // Dirección del contrato USDT real
  const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  
  const minter = await USDTMinter.deploy(USDT_ADDRESS);
  await minter.deployed();
  
  console.log("\n✅ ¡Contrato deployado exitosamente!\n");
  console.log("📝 Información de Deploy:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Dirección: ${minter.address}`);
  console.log(`Red: ${hre.network.name}`);
  console.log(`Deploy por: ${deployer.address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Guardar dirección en archivo
  const fs = require("fs");
  const path = require("path");
  
  const configPath = path.join(__dirname, "../.env.contracts");
  const content = `# USDTMinter Contract Address
VITE_USDT_MINTER_ADDRESS=${minter.address}
VITE_USDT_MINTER_NETWORK=${hre.network.name}
VITE_USDT_MINTER_DEPLOYED_AT=${new Date().toISOString()}
`;

  fs.writeFileSync(configPath, content);
  console.log(`📄 Configuración guardada en: .env.contracts`);
  console.log(`   Copia estos valores a tu .env principal\n`);

  // Verificar en Etherscan (si es Mainnet o Testnet)
  if (hre.network.name !== "hardhat") {
    console.log("🔍 Esperando confirmaciones para verificar en Etherscan...");
    await minter.deployTransaction.wait(5);
    
    console.log("\n📤 Intentando verificar en Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: minter.address,
        constructorArguments: [USDT_ADDRESS]
      });
      console.log("✅ Contrato verificado en Etherscan!");
    } catch (error) {
      console.log("⚠️  No se pudo verificar en Etherscan (normal si no tienes API key)");
      console.log(`   Puedes verificar manualmente en: https://etherscan.io/address/${minter.address}`);
    }
  }

  console.log("\n🎉 ¡Deploy completado!");
  console.log("\n📚 Próximos pasos:");
  console.log("1. Copia VITE_USDT_MINTER_ADDRESS a tu .env");
  console.log("2. Actualiza web3-transaction.ts con la dirección");
  console.log("3. Prueba en tu aplicación\n");

  return minter.address;
}

main()
  .then((address) => {
    console.log(`✨ Dirección del contrato: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

