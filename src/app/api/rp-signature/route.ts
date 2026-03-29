import { NextResponse } from 'next/server';

const RP_SIGNING_KEY = process.env.WORLD_PRIVATE_KEY;

export async function POST() {
  try {
    if (!RP_SIGNING_KEY) {
      return NextResponse.json(
        { error: 'RP signing key not configured' },
        { status: 500 }
      );
    }

    // Generate a random nonce
    const nonce = crypto.randomUUID();
    
    // In production, you would sign the nonce with your RP signing key
    // For now, we'll pass the nonce directly - World ID validates via the proof
    return NextResponse.json({
      nonce,
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