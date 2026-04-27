'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { MiniKit } from '@worldcoin/minikit-js';
import { config } from '@/lib/wagmi';
import { XMTPProvider } from '@/lib/xmtp-provider';

// MiniKit requires a valid app_id (format: app_xxx) from developer.world.org.
// Fail loudly at runtime if missing — the TypeScript `!` assertion only hides the type error.
const APP_ID = process.env.NEXT_PUBLIC_APP_ID;
if (!APP_ID) throw new Error('NEXT_PUBLIC_APP_ID is required — get it from https://developer.world.org');

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // When running inside World App, add a CSS class to the body so we can scope
  // Mini App-specific styles (e.g. bottom safe zone) without affecting standalone.
  // Also log MiniKit init status for debugging.
  useEffect(() => {
    // Log full MiniKit state for debugging
    console.log('[MiniKit] isInstalled():', MiniKit.isInstalled(true));
    console.log('[MiniKit] isInWorldApp():', MiniKit.isInWorldApp());
    console.log('[MiniKit] user:', MiniKit.user);
    console.log('[MiniKit] deviceProperties:', MiniKit.deviceProperties);
    console.log('[MiniKit] location:', MiniKit.location);
    console.log('[MiniKit] window.WorldApp:', (window as unknown as { WorldApp?: unknown }).WorldApp);
    console.log('[MiniKit] window.MiniKit:', (window as unknown as { MiniKit?: unknown }).MiniKit);

    if (MiniKit.isInstalled()) {
      document.body.classList.add('is-mini-app');
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          props={{
            appId: APP_ID as `app_${string}`,
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