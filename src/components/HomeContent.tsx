'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

function HomeContentInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab = (raw === 'feed' || raw === 'chat' || raw === 'profile') ? raw : null;
  return <AppShell initialTab={tab ?? 'feed'} />;
}

export default function HomeContent() {
  return (
    <Suspense>
      <HomeContentInner />
    </Suspense>
  );
}
