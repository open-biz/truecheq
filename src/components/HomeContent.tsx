'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

function HomeContentInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab = (raw === 'sell' || raw === 'buy' || raw === 'chat') ? raw : null;
  return <AppShell initialTab={tab ?? 'sell'} />;
}

export default function HomeContent() {
  return (
    <Suspense>
      <HomeContentInner />
    </Suspense>
  );
}
