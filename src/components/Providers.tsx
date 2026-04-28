'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { XMTPProvider } from '@/lib/xmtp-provider';
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

// Manual MiniKit.install() instead of MiniKitProvider to prevent Safari jump.
// Per Worldcoin docs: install() must complete before any commands are called.
// We do this here once at app root, ensuring MiniKit is ready before child
// components attempt to use MiniKit commands.
function MiniKitInitializer({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Only install if inside World App — prevents errors in standalone browser mode
    if (MiniKit.isInstalled()) {
      const { success } = MiniKit.install();
      if (success) {
        console.log('[MiniKit] Installed successfully');
        // Add body class for mini-app specific styling
        document.body.classList.add('is-mini-app');
      } else {
        console.warn('[MiniKit] Install returned false');
      }
    }
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  // Detect if we're in mini-app mode
  const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMiniApp(MiniKit.isInstalled());
  }, []);

  // Hydration: don't render until we know the environment
  if (isMiniApp === null) return null;

  // Mini-app mode: Only MiniKit + XMTP (no Wagmi)
  if (isMiniApp) {
    return (
      <XMTPProvider>
        <MiniKitInitializer>
          {children}
        </MiniKitInitializer>
      </XMTPProvider>
    );
  }

  // Standalone browser mode: Wagmi + XMTP
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <XMTPProvider>
          {children}
        </XMTPProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}