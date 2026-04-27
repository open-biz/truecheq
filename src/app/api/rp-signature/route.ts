import { NextResponse } from 'next/server';
import { signRequest } from '@worldcoin/idkit';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { action?: string; ttl?: number };
    const action = body.action || 'trucheq_auth';
    
    // Use RP_SIGNING_KEY from env
    const signingKey = process.env.RP_SIGNING_KEY;
    
    if (!signingKey) {
      console.error('[RP-Signature] RP_SIGNING_KEY not configured');
      return NextResponse.json(
        { error: 'RP_SIGNING_KEY not configured' },
        { status: 500 }
      );
    }

    // IDKit 4.1+ expects a single options object.
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      action,
      signingKeyHex: signingKey,
      ttl: body.ttl,
    });

    console.log('[RP-Signature] Generated:', { action, nonce, expiresAt });

    return NextResponse.json({
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('[RP-Signature] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}