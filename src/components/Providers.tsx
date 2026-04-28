'use client';

import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { ReactNode } from 'react';
import { XMTPProvider } from '@/lib/xmtp-provider';

// Clean providers setup: MiniKit + XMTP only (no Wagmi)
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider>
      <XMTPProvider>
        {children}
      </XMTPProvider>
    </MiniKitProvider>
  );
}