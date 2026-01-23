const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Testing with account:", signer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "TCRO");

  const contractAddress = "0x5216905cc7b7fF4738982837030921A22176c8C7";
  const TruCheq = await hre.ethers.getContractAt("TruCheqNative", contractAddress);

  const price = hre.ethers.parseEther("0.1");

  console.log("1. Creating a deal for 0.1 TCRO...");
  const createTx = await TruCheq.createDeal(price);
  const createReceipt = await createTx.wait();
  
  // In ethers v6, we look for events in the receipt
  // The DealCreated event is emitted.
  console.log("Deal created! Hash:", createTx.hash);

  // For this simple test, we'll just create it. 
  // If we want to pledge, we can do it from the same account for simplicity of the script
  console.log("2. Pledging 0.1 TCRO to the deal...");
  const dealId = 0; // Assuming it's the first deal or we could parse from logs
  const pledgeTx = await TruCheq.pledge(dealId, { value: price });
  await pledgeTx.wait();
  console.log("Funds pledged! Hash:", pledgeTx.hash);

  console.log("Test transaction flow completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
