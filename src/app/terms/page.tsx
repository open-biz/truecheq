import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LucideArrowLeft, LucideShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | TruCheq',
  description: 'Terms of Service for TruCheq — Headless Web3 P2P Commerce Protocol',
};

const LAST_UPDATED = 'March 2025';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white gap-2">
              <LucideArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <LucideShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Legal</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">1. Acceptance of Terms</h2>
            <p>By accessing or using TruCheq (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. TruCheq is a headless Web3 peer-to-peer commerce protocol that enables identity-verified transactions between buyers and sellers on social platforms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">2. Description of Service</h2>
            <p>TruCheq provides the following functionalities:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity Verification</strong> — Integration with World ID (via IDKit) to verify user identity through Orb or Device verification, establishing proof of personhood for transaction trust.</li>
              <li><strong>Listing Creation</strong> — Sellers can create commerce listings with item details, images, and pricing, stored on IPFS (InterPlanetary File System) via Filebase for decentralized, censorship-resistant storage.</li>
              <li><strong>Encrypted Messaging</strong> — Buyer-seller communication via XMTP (Extensible Message Transport Protocol), providing end-to-end encrypted chat for transaction coordination.</li>
              <li><strong>Payment Processing</strong> — USDC payments via Coinbase x402 protocol on Base and World Chain networks, enabling agent-ready and standard payment flows.</li>
              <li><strong>Mini App Integration</strong> — Native experience within World App via MiniKit, providing seamless wallet connection and transaction signing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are solely responsible for the accuracy and legality of listings you create.</li>
              <li>You must not use the Service for illegal activities, fraud, or the sale of prohibited items.</li>
              <li>You are responsible for maintaining the security of your wallet and private keys.</li>
              <li>You must complete transactions in good faith once payment commitments are made.</li>
              <li>You must not attempt to circumvent identity verification requirements.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">4. Identity Verification</h2>
            <p>TruCheq uses World ID to establish proof of personhood. Verification levels include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Orb Verified</strong> — Highest trust level, requiring biometric verification via a physical World ID Orb device.</li>
              <li><strong>Device Verified</strong> — Standard verification via the World App on a registered mobile device.</li>
            </ul>
            <p>Verification status is displayed on listings and transactions to help users assess counterparty trust. TruCheq does not store biometric data — all verification is handled by World ID&rsquo;s zero-knowledge proof system.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">5. Payments &amp; Transactions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All payments are made in USDC on supported blockchain networks (Base, World Chain).</li>
              <li>Payments are final and irreversible once confirmed on-chain. TruCheq has no ability to reverse or refund payments.</li>
              <li>Transaction fees (gas) are the responsibility of the user.</li>
              <li>TruCheq does not custody funds at any point — payments go directly from buyer to seller.</li>
              <li>The x402 payment protocol enables both human and AI agent-initiated payments for programmable commerce.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">6. Decentralized Storage</h2>
            <p>Listing metadata and images are stored on IPFS via Filebase. This means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Data persistence depends on IPFS pinning and network availability, not TruCheq servers.</li>
              <li>Once uploaded, data may be difficult or impossible to delete from the IPFS network.</li>
              <li>TruCheq is not responsible for IPFS network outages, data unpinning, or gateway failures.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">7. Disclaimers</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind.</li>
              <li>TruCheq does not guarantee the quality, safety, or legality of items listed by users.</li>
              <li>TruCheq is not a party to any transaction between buyers and sellers and bears no responsibility for transaction outcomes.</li>
              <li>We do not guarantee uninterrupted or error-free operation of the Service, XMTP messaging, or blockchain networks.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">8. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, TruCheq and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or funds, arising from your use of the Service. This includes losses resulting from:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Failed, delayed, or erroneous blockchain transactions.</li>
              <li>Fraudulent or misrepresented listings by other users.</li>
              <li>Loss of wallet access, private keys, or funds.</li>
              <li>XMTP messaging failures or outages.</li>
              <li>IPFS data unavailability or corruption.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">9. Privacy</h2>
            <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Key points include minimal data collection, IPFS-based storage, and XMTP end-to-end encrypted messaging.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">10. Modifications</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the modified Terms. We will update the &ldquo;Last updated&rdquo; date accordingly.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">11. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or use of the Service shall be resolved through binding arbitration.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white tracking-tight">12. Contact</h2>
            <p>For questions about these Terms, contact us through the TruCheq community channels or open an issue on our repository.</p>
          </section>
        </div>

        <div className="pt-8 border-t border-white/10 text-center">
          <Link href="/">
            <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
              <LucideArrowLeft className="w-4 h-4 mr-2" />
              Return to TruCheq
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
