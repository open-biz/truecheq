'use client';

import React, { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { config } from '@/lib/wagmi';
import { XMTPProvider } from '@/lib/xmtp-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Custom World-focused wallet UI - no RainbowKit needed
  // MiniKitProvider enables native World App wallet via deep links
  // The worldApp() connector in wagmi config handles the fallback
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          props={{
            appId: process.env.NEXT_PUBLIC_APP_ID || 'app_trucheq',
            wagmiConfig: config,
          }}
        >
          <XMTPProvider>
            {children}
          </XMTPProvider>
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}