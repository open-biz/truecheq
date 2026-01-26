const hre = require("hardhat");

async function main() {
  console.log("Deploying TruCheqRegistry...");
  
  const TruCheqRegistry = await hre.ethers.getContractFactory("TruCheqRegistry");
  const registry = await TruCheqRegistry.deploy();

  await registry.waitForDeployment();

  console.log("TruCheqRegistry deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
