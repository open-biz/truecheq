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
  // Get your own free projectId at https://cloud.walletconnect.com
  // This is a demo ID that may have rate limits - replace with your own for production
  projectId: 'abc123def456789', 
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
});
