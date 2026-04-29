import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@worldcoin/mini-apps-ui-kit-react/styles.css";
import "./globals.css";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// NOTE: intentionally minimal — no manifest, no apple-touch-icon, no PWA hints.
// PWA / standalone display signals can cause iOS World App webview to bump the
// user into Safari instead of staying inside the mini app shell.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://trucheq.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TruCheq',
    template: '%s | TruCheq',
  },
  description: 'Sybil-resistant P2P commerce powered by World ID, XMTP, and Coinbase x402',
  openGraph: {
    title: 'TruCheq',
    description: 'Sybil-resistant P2P commerce powered by World ID, XMTP, and Coinbase x402',
    url: siteUrl,
    siteName: 'TruCheq',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'TruCheq — P2P Commerce' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TruCheq',
    description: 'Sybil-resistant P2P commerce powered by World ID, XMTP, and Coinbase x402',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" theme="dark" richColors />
        </Providers>
      </body>
    </html>
  );
}