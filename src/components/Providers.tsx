'use client';

import { ReactNode, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { XMTPProvider } from '@/lib/xmtp-provider';

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
  return (
    <XMTPProvider>
      <MiniKitInitializer>
        {children}
      </MiniKitInitializer>
    </XMTPProvider>
  );
}