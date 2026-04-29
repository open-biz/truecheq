import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { fetchListingMetaEdge } from '@/lib/fetch-listing';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const metaUrl = searchParams.get('meta') ? decodeURIComponent(searchParams.get('meta')!) : '';

  const listing = metaUrl ? await fetchListingMetaEdge(metaUrl) : null;

  const itemName = listing?.itemName || 'TruCheq Listing';
  const price = listing?.price || '';
  const imageUrl = listing?.images?.[0];
  const isOrbVerified = listing?.isOrbVerified ?? false;
  const verificationLevel = listing?.verificationLevel ?? (isOrbVerified ? 'orb' : 'device');

  // Brand colors
  const GREEN = '#00D632';
  const BG = '#070709';
  const CARD = '#16161A';
  const WHITE = '#F8FAFC';
  const MUTED = '#94A3B8';

  // Pre-fetch remote image if available
  let imageData: ArrayBuffer | null = null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        imageData = await imgRes.arrayBuffer();
      }
    } catch {
      // Remote image fetch failed — use placeholder
    }
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          background: BG,
          color: WHITE,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Left: Product image or placeholder */}
        <div
          style={{
            width: 600,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: CARD,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {imageData ? (
            /* satori expects string src but accepts ArrayBuffer internally — double-assert is the documented pattern */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageData as unknown as string}
              alt={itemName}
              style={{
                width: 600,
                height: 630,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 600,
                height: 630,
              }}
            >
              {/* Placeholder pattern */}
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: 'rgba(255,255,255,0.06)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                TC
              </div>
            </div>
          )}

          {/* Price badge overlay */}
          {price && (
            <div
              style={{
                position: 'absolute',
                bottom: 32,
                left: 32,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: GREEN,
                color: BG,
                padding: '12px 24px',
                borderRadius: 16,
                fontSize: 28,
                fontWeight: 900,
                boxShadow: '0 4px 24px rgba(0,214,50,0.4)',
              }}
            >
              ${price} USDC
            </div>
          )}
        </div>

        {/* Right: Listing info */}
        <div
          style={{
            width: 600,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '48px 56px',
            gap: 24,
          }}
        >
          {/* Logo + brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: GREEN,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
                fontStyle: 'italic',
                color: BG,
              }}
            >
              T
            </div>
            <span
              style={{
                fontSize: 20,
                fontWeight: 900,
                fontStyle: 'italic',
                letterSpacing: '-0.02em',
                color: WHITE,
              }}
            >
              TruCheq
            </span>
          </div>

          {/* Verification badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              border: `1px solid ${verificationLevel === 'orb' ? 'rgba(0,214,50,0.3)' : verificationLevel === 'device' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
              background: verificationLevel === 'orb' ? 'rgba(0,214,50,0.1)' : verificationLevel === 'device' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
              alignSelf: 'flex-start',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: verificationLevel === 'orb' ? GREEN : verificationLevel === 'device' ? '#60A5FA' : 'rgba(255,255,255,0.3)',
              }}
            >
              {verificationLevel === 'orb' ? '⬡ Orb Verified' : verificationLevel === 'device' ? '📱 Device Verified' : '👤 Unverified'}
            </span>
          </div>

          {/* Item name */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: WHITE,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {itemName}
          </div>

          {/* Description */}
          {listing?.description && (
            <div
              style={{
                fontSize: 16,
                color: MUTED,
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {listing.description}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              fontSize: 14,
              fontWeight: 800,
              color: GREEN,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            View Listing →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );

  // Add cache headers for social crawlers — 5 min fresh, 10 min stale-while-revalidate
  const body = imageResponse.body;
  if (!body) {
    return new Response('Failed to generate image', { status: 500 });
  }
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
