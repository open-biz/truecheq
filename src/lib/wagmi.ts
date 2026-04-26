import { http, createConfig, createStorage } from 'wagmi';
import { worldChain, worldChainSepolia, base, baseSepolia } from './chains';
import { worldApp } from '@worldcoin/minikit-js/wagmi';
import '@worldcoin/minikit-js/wagmi-fallback'; // Register wagmi fallback for MiniKit commands on web
import { injected } from 'wagmi/connectors';

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
 * - World App via deep links (worldApp() connector - auto-handles MiniKit fallback)
 * - MetaMask and other injected wallets (via window.ethereum)
 * 
 * The worldApp() connector automatically:
 * - Opens World App via deep link when on mobile
 * - Falls back to wagmi wallet connection on desktop
 * - Registers the wagmi fallback for commands without native support
 */
export const config = createConfig({
  chains: [worldChain, worldChainSepolia, base, baseSepolia],
  ssr: true,
  transports: {
    [worldChain.id]: http(),
    [worldChainSepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  connectors: [
    worldApp(),        // World App deep links (mobile) + wagmi fallback (desktop)
    injected(),        // MetaMask, Rabby, and other injected wallets
  ],
});