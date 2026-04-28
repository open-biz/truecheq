'use client';

import { ReactNode } from 'react';

// TEST: MiniKitProvider removed to isolate if MiniKit init causes Safari jump.
// If this fixes it, the issue is MiniKitProvider's internal install() call.
// If it still jumps, the issue is in developer portal config (content_url mismatch).
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}