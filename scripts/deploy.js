const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TruCheqRegistry to Base Sepolia...");

  const TruCheqRegistry = await ethers.getContractFactory("TruCheqRegistry");
  const registry = await TruCheqRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`\n✅ TruCheqRegistry deployed to: ${address}`);
  console.log(`\nSet this in your .env.local:\n  NEXT_PUBLIC_REGISTRY_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
