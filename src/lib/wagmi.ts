import { http, createConfig, createStorage } from 'wagmi';
import { baseSepolia } from './chains';
import { injected } from 'wagmi/connectors';
import { metaMask } from 'wagmi/connectors';

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

// Use createConfig instead of getDefaultConfig to avoid WalletConnect
// Include MetaMask and other injected wallets
export const config = createConfig({
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  connectors: [
    metaMask(),
  ],
});
