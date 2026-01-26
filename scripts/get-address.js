const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
    console.error("No MNEMONIC found in .env.local");
    process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(mnemonic);
console.log("Deployer Address:", wallet.address);
