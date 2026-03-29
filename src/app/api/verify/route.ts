import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_staging_...';
const RP_ID = APP_ID.replace('app_', 'rp_');

export async function POST(request: NextRequest) {
  try {
    // World ID v4 - forward the full payload to the v4 verify endpoint
    const idkitResponse = await request.json();

    // Forward the proof to World ID v4 verify endpoint
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${RP_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idkitResponse),
      }
    );

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => ({}));
      console.error('World ID verification failed:', errorData);
      return NextResponse.json(
        { error: errorData?.message || errorData?.detail || 'Verification failed' },
        { status: 400 }
      );
    }

    const result = await verifyRes.json();

    // Extract verification info from response
    const nullifier = idkitResponse.responses?.[0]?.nullifier ?? idkitResponse.nullifier;
    const verificationLevel = idkitResponse.responses?.[0]?.identifier === 'orb' ? 'orb' : 'device';

    return NextResponse.json({
      success: true,
      nullifier_hash: nullifier,
      verification_level: verificationLevel,
      verified: result.success !== false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verify API error:', message);
    return NextResponse.json(
      { error: 'Server error during verification' },
      { status: 500 }
    );
  }
}
