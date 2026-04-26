'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { config } from '@/lib/wagmi';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
          {children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}