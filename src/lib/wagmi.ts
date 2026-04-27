import { http, createConfig, createStorage } from 'wagmi';
import { worldChain, worldChainSepolia, base, baseSepolia } from './chains';
import { worldApp } from '@worldcoin/minikit-js/wagmi';
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
 * - World App native connector only (mini app mode)
 * 
 * The worldApp() connector only works when window.WorldApp exists (inside World App).
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
  connectors: [
    worldApp(), // World App native connector (mini app only)
  ],
});