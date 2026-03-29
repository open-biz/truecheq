import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, createStorage } from 'wagmi';
import { baseSepolia } from './chains';

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

if (typeof window === 'undefined') {
  (global as any).indexedDB = {
    open: () => ({}),
  };
}

export const config = getDefaultConfig({
  appName: 'TruCheq',
  projectId: '39a97f3743c39130761e089d701e5491',
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
});
