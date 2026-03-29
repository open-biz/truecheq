import { NextResponse } from 'next/server';
import type { IDKitResult } from '@worldcoin/idkit';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    // Get rp_id from env
    const rpId = process.env.NEXT_PUBLIC_RP_ID;
    if (!rpId) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_RP_ID not configured' },
        { status: 500 }
      );
    }

    // Get the IDKit result from the request body
    const { devPortalPayload } = (await request.json()) as { devPortalPayload?: IDKitResult };
    
    if (!devPortalPayload) {
      return NextResponse.json(
        { error: 'Missing devPortalPayload in request body' },
        { status: 400 }
      );
    }

    console.log('[Verify] Forwarding to World ID v4 verify endpoint for rp_id:', rpId);

    // Forward the proof to World ID v4 verify endpoint
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devPortalPayload),
      }
    );

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => ({}));
      console.error('[Verify] World ID verification failed:', errorData);
      return NextResponse.json(
        { error: errorData?.message || errorData?.detail || 'Verification failed' },
        { status: verifyRes.status }
      );
    }

    const result = await verifyRes.json();
    console.log('[Verify] Success:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Verify] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
