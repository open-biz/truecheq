import { defineChain } from 'viem';

// World Chain (formerly Worldcoin L2) - from AgentKit docs
export const worldChain = defineChain({
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'WorldChain Explorer', url: 'https://worldchain-mainnet.g.alchemy.com/explorer' },
  },
  testnet: false,
});

// World Chain Sepolia (testnet)
export const worldChainSepolia = defineChain({
  id: 4801,
  name: 'World Chain Sepolia',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-sepolia.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'WorldChain Explorer', url: 'https://worldchain-sepolia.g.alchemy.com/explorer' },
  },
  testnet: true,
});

// Base Mainnet
export const base = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
});

export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});
