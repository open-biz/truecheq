'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Disable SSR — MiniKit depends on window.WorldApp which only exists on the client.
const PaymentPageContent = dynamic(() => import('@/components/PaymentPageContent'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0A0F14]" />,
});

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  return <PaymentPageContent id={id} />;
}
