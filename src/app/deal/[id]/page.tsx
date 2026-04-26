'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Disable SSR — MiniKit depends on window.WorldApp which only exists on the client.
const DealPageContent = dynamic(() => import('@/components/DealPageContent'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0A0F14]" />,
});

export default function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ meta?: string }> }) {
  const { id } = React.use(params);
  const { meta } = React.use(searchParams);

  return <DealPageContent id={id} meta={meta ? decodeURIComponent(meta) : undefined} />;
}
