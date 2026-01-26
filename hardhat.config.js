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
    artifacts: "./artifacts"
  },
  networks: {
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: mnemonic ? {
        mnemonic: mnemonic,
      } : [],
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: mnemonic ? {
        mnemonic: mnemonic,
      } : [],
    },
  },
};
