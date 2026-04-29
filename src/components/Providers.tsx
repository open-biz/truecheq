'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { XMTPProvider } from '@/lib/xmtp-provider';
import { AuthProvider, WagmiAuthSync } from '@/lib/auth-provider';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { worldChain } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Standalone browser mode: Wagmi with injected connector (MetaMask, Coinbase, etc.)
// No WalletConnect Cloud dependency — just browser-extension wallets.
const wagmiConfig = createConfig({
  chains: [worldChain],
  connectors: [injected()],
  transports: {
    [worldChain.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  // Detect if we're in mini-app mode (synchronous after first render)
  const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMiniApp(MiniKit.isInstalled());
  }, []);

  // Hydration: don't render until we know the environment
  if (isMiniApp === null) return null;

  // Mini-app mode: AuthProvider handles MiniKit.install() + walletAuth in
  // the same effect (per World docs FAQ — avoids race conditions).
  if (isMiniApp) {
    return (
      <AuthProvider>
        <XMTPProvider>{children}</XMTPProvider>
      </AuthProvider>
    );
  }

  // Standalone browser mode: Wagmi + injected connector + AuthProvider + XMTP.
  // AuthProvider listens to wagmi account changes for wallet-based login.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WagmiAuthSync />
          <XMTPProvider>{children}</XMTPProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
