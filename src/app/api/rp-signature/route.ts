import { NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit/signing';

const RP_SIGNING_KEY = process.env.WORLD_PRIVATE_KEY;
const ACTION = 'trucheq_auth';

export async function POST() {
  try {
    if (!RP_SIGNING_KEY) {
      return NextResponse.json(
        { error: 'RP signing key not configured' },
        { status: 500 }
      );
    }

    // Sign the request with the RP signing key
    const { sig, nonce, createdAt, expiresAt } = signRequest(ACTION, RP_SIGNING_KEY);

    return NextResponse.json({
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('RP signature error:', message);
    return NextResponse.json(
      { error: 'Failed to generate RP signature' },
      { status: 500 }
    );
  }
}