'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always wrap with WagmiProvider (supports SSR with ssr: true config)
  // RainbowKit is client-only so wrap that conditionally
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {isClient ? (
          <RainbowKitProvider 
            theme={darkTheme()}
            initialChain={84532} // Base Sepolia
          >
            {children}
          </RainbowKitProvider>
        ) : (
          children
        )}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
