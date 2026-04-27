import { http, createConfig, createStorage } from 'wagmi';
import { worldChain, worldChainSepolia, base, baseSepolia } from './chains';
import '@worldcoin/minikit-js/wagmi-fallback'; // Register wagmi fallback for MiniKit commands on web

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

if (typeof window === 'undefined') {
  (global as unknown as { indexedDB: { open: () => unknown } }).indexedDB = {
    open: () => ({}),
  };
}

/**
 * TruCheq Wagmi Configuration
 *
 * Supports World Chain (eip155:480) and Base networks.
 *
 * Wallet Support:
 * - MiniKit.walletAuth() for authentication (mini app mode)
 * - Wagmi for chain operations and transaction handling
 *
 * The wagmi-fallback module allows MiniKit commands to delegate to wagmi
 * when not running inside World App.
 */
export const config = createConfig({
  chains: [worldChain, base, worldChainSepolia, baseSepolia],
  ssr: true,
  transports: {
    [worldChain.id]: http(),
    [base.id]: http(),
    [worldChainSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  connectors: [],
});