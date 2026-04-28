'use client';

import { ReactNode } from 'react';
import { XMTPProvider } from '@/lib/xmtp-provider';

// MiniKitProvider REMOVED — its internal install() triggers Safari handoff.
// MiniKit SDK works fine as direct imports (MiniKit.isInstalled(), MiniKit.user, etc.)
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <XMTPProvider>
      {children}
    </XMTPProvider>
  );
}