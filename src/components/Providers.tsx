'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { XMTPProvider } from '@/lib/xmtp-provider';
import { AuthProvider } from '@/lib/auth-provider';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { worldChain } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Standalone browser mode: Wagmi config for non-mini-app usage
const wagmiConfig = createConfig({
  chains: [worldChain],
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

  // Standalone browser mode: Wagmi + AuthProvider + XMTP.
  // AuthProvider doesn't auto-auth here; UI calls login() when needed.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <XMTPProvider>{children}</XMTPProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
