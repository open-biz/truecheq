import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'About',
  description: 'TruCheq — sybil-resistant P2P commerce powered by World ID verification, XMTP encrypted messaging, and Coinbase x402 payments on Base.',
  openGraph: {
    title: 'TruCheq — Trust-First P2P Commerce',
    description: 'Sybil-resistant P2P commerce powered by World ID verification, XMTP encrypted messaging, and Coinbase x402 payments on Base.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'TruCheq — P2P Commerce' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TruCheq — Trust-First P2P Commerce',
    description: 'Sybil-resistant P2P commerce powered by World ID verification, XMTP encrypted messaging, and Coinbase x402 payments on Base.',
  },
};

export default function AboutPage() {
  return <LandingPage />;
}
