import { http, createConfig, createStorage } from 'wagmi';
import { baseSepolia, base } from './chains';
import { metaMask } from 'wagmi/connectors';

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

// Use createConfig instead of getDefaultConfig to avoid WalletConnect
// Include MetaMask and other injected wallets
export const config = createConfig({
  chains: [base, baseSepolia],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : noopStorage,
  }),
  connectors: [
    metaMask(),
  ],
});
