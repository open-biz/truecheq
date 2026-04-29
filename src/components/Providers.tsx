'use client';

import { ReactNode } from 'react';
import { XMTPProvider } from '@/lib/xmtp-provider';
import { AuthProvider, WagmiAuthSync } from '@/lib/auth-provider';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { worldApp } from '@worldcoin/minikit-js/wagmi';
import { injected } from 'wagmi/connectors';
import { worldChain } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';

// Wagmi config: worldApp connector auto-detects World App and falls back to
// injected wallet (MetaMask, etc.) on standalone web. Must be first in array.
const wagmiConfig = createConfig({
  chains: [worldChain],
  connectors: [worldApp(), injected()],
  transports: {
    [worldChain.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          props={{
            appId: process.env.NEXT_PUBLIC_APP_ID!,
            wagmiConfig,
          }}
        >
          <AuthProvider>
            <WagmiAuthSync />
            <XMTPProvider>{children}</XMTPProvider>
          </AuthProvider>
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
