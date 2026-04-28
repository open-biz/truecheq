'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';

function HomeContentInner() {
  // Tab routing disabled for static Hello World test
  return <AppShell />;
}

export default function HomeContent() {
  return (
    <Suspense>
      <HomeContentInner />
    </Suspense>
  );
}
