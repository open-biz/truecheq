require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

const mnemonic = process.env.MNEMONIC || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: mnemonic ? { mnemonic } : [],
    },
  },
};
