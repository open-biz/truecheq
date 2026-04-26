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
 * - World App native connector (worldApp() — only works inside World App WebView)
 * - MetaMask and other injected wallets (injected() — works in standalone browsers)
 * 
 * The worldApp() connector only works when window.WorldApp exists (inside World App).
 * In standalone browsers, injected() handles MetaMask, Rabby, etc.
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
    worldApp(),        // World App native connector (only works inside World App WebView)
    // Only add injected() connector outside World App to prevent deep-link
    // triggers that open Safari from within the World App webview.
    // MiniKit.isInstalled() checks window.WorldApp internally.
    ...(typeof window !== 'undefined' && !(window as unknown as { WorldApp?: unknown }).WorldApp
      ? [injected()]
      : []),
  ],
});