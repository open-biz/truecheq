require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

const mnemonic = process.env.MNEMONIC || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: mnemonic ? {
        mnemonic: mnemonic,
      } : [],
    },
  },
};
