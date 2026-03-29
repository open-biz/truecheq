import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_staging_...';
const ACTION = 'trucheq_auth';

export async function POST(request: NextRequest) {
  try {
    const proof = await request.json();

    const { merkle_root, nullifier_hash, proof: zkProof, verification_level } = proof;

    if (!merkle_root || !nullifier_hash || !zkProof) {
      return NextResponse.json(
        { error: 'Missing proof fields' },
        { status: 400 }
      );
    }

    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof: zkProof,
          action: ACTION,
          signal: '',
        }),
      }
    );

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => ({}));
      console.error('World ID verification failed:', errorData);
      return NextResponse.json(
        { error: errorData?.detail || 'Verification failed' },
        { status: 400 }
      );
    }

    const result = await verifyRes.json();

    return NextResponse.json({
      success: true,
      nullifier_hash,
      verification_level,
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
