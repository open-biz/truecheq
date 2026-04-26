import dynamic from 'next/dynamic';

// Disable SSR — MiniKit depends on window.WorldApp which only exists on the client.
// Without this, hydration mismatches occur when running inside World App.
const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0A0F14]" />,
});

export default function Home() {
  return <HomeContent />;
}
