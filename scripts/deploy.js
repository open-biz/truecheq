const hre = require("hardhat");

async function main() {
  const TruCheq = await hre.ethers.getContractFactory("TruCheqNative");
  const trucheq = await TruCheq.deploy();

  await trucheq.waitForDeployment();

  console.log("TruCheqNative deployed to:", await trucheq.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
