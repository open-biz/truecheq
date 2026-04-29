import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchListingMeta } from '@/lib/fetch-listing';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ meta?: string }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
): Promise<Metadata> {
  const { meta } = await searchParams;
  const metaUrl = meta ? decodeURIComponent(meta) : '';
  const listing = metaUrl ? await fetchListingMeta(metaUrl) : null;

  const itemName = listing?.itemName || 'Listing';
  const price = listing?.price;
  const description = listing?.description || 'View this listing on TruCheq — sybil-resistant P2P commerce';
  const isOrbVerified = listing?.isOrbVerified ?? false;
  const verificationLevel = listing?.verificationLevel ?? (isOrbVerified ? 'orb' : 'device');
  const verificationLabel = verificationLevel === 'orb' ? 'Orb Verified' : verificationLevel === 'device' ? 'Device Verified' : 'Unverified';

  // Use absolute title to avoid duplication with root layout template ('%s | TruCheq')
  const titleSuffix = price
    ? `${itemName} — $${price} USDC · ${verificationLabel}`
    : `${itemName} · ${verificationLabel}`;

  // OG image URL — served by /api/og route handler with query params
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://trucheq.com';
  const ogImageUrl = new URL('/api/og', siteOrigin);
  if (metaUrl) ogImageUrl.searchParams.set('meta', metaUrl);

  return {
    title: { absolute: `${titleSuffix} | TruCheq` },
    description,
    openGraph: {
      title: `${titleSuffix} | TruCheq`,
      description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: itemName }],
      type: 'website',
      siteName: 'TruCheq',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titleSuffix} | TruCheq`,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}

export default async function DealPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { meta } = await searchParams;
  const metaUrl = meta ? decodeURIComponent(meta) : '';
  const listing = metaUrl ? await fetchListingMeta(metaUrl) : null;

  const itemName = listing?.itemName || 'Listing';
  const price = listing?.price || '';
  const description = listing?.description || '';
  const imageUrl = listing?.images?.[0];
  const isOrbVerified = listing?.isOrbVerified ?? false;
  const verificationLevel = listing?.verificationLevel ?? (isOrbVerified ? 'orb' : 'device');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black italic text-lg">
            T
          </div>
          <span className="text-xl font-black italic text-white tracking-tighter">TruCheq</span>
        </div>

        {/* Product Image */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5 bg-card">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={itemName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black uppercase tracking-[0.2em] text-white/10">TruCheq</span>
            </div>
          )}
          {price && (
            <div className="absolute bottom-3 right-3 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black text-sm shadow-[0_0_12px_rgba(0,214,50,0.3)]">
              ${price} USDC
            </div>
          )}
        </div>

        {/* Title & Verification */}
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-black text-white tracking-tight">{itemName}</h1>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
            verificationLevel === 'orb'
              ? 'text-primary bg-primary/10 border-primary/20'
              : verificationLevel === 'device'
              ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
              : 'text-white/30 bg-white/[0.03] border-white/[0.08]'
          }`}>
            {verificationLevel === 'orb' ? '⬡ Orb Verified' : verificationLevel === 'device' ? '📱 Device Verified' : '👤 Unverified'}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-white/50 leading-relaxed mb-6">{description}</p>
        )}

        {/* CTA — link back to main app */}
        <Link
          href="/?tab=buy"
          className="block w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-center leading-[3.5rem] shadow-[0_4px_24px_rgba(0,214,50,0.3)] hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          Open in TruCheq
        </Link>

        {/* CID reference */}
        <p className="text-[10px] text-white/15 font-mono text-center mt-4">
          CID: {id}
        </p>
      </div>
    </div>
  );
}
