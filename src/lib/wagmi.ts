import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, createStorage } from 'wagmi';
import { cronosTestnet } from './chains';

// SSR-safe noop storage for the server
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Polyfill indexedDB for the server environment to prevent ReferenceErrors 
// during Next.js static generation/SSR data collection.
if (typeof window === 'undefined') {
  (global as any).indexedDB = {
    open: () => ({}),
  };
}

export const config = getDefaultConfig({
  appName: 'TruCheq',
  projectId: '39a97f3743c39130761e089d701e5491', 
  chains: [cronosTestnet],
  ssr: true,
  transports: {
    [cronosTestnet.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
});
