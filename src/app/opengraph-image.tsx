import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function DefaultOGImage() {
  const GREEN = '#00D632';
  const BG = '#070709';
  const CARD = '#16161A';
  const WHITE = '#F8FAFC';
  const MUTED = '#94A3B8';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: BG,
          color: WHITE,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 24,
            padding: '48px',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              background: GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 900,
              fontStyle: 'italic',
              color: BG,
              boxShadow: '0 0 48px rgba(0,214,50,0.25)',
            }}
          >
            T
          </div>

          {/* Brand name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              color: WHITE,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            TruCheq
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 22,
              color: MUTED,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Sybil-resistant P2P commerce powered by World ID, XMTP & Coinbase
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
            }}
          >
            {['World ID Verified', 'XMTP Encrypted', 'x402 Payments', 'IPFS Hosted'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    borderRadius: 999,
                    background: CARD,
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13,
                    fontWeight: 800,
                    color: GREEN,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: GREEN,
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
