import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from 'x402-next';
import { facilitator } from '@coinbase/x402';
import { formatPriceForX402, BASE_CHAIN_ID } from '@/lib/x402';
import type { RouteConfig } from 'x402/types';

// The payTo address — all x402 agent payments are routed here.
// In production, this is the marketplace treasury that settles with individual sellers.
// MUST be set via NEXT_PUBLIC_X402_PAY_TO env var.
const PAY_TO = process.env.NEXT_PUBLIC_X402_PAY_TO as `0x${string}` | undefined;

if (!PAY_TO) {
  console.warn('[x402] NEXT_PUBLIC_X402_PAY_TO not set — agent payments disabled');
}

export const dynamic = 'force-dynamic';

// ============================================================================
// Core handler — runs AFTER x402 payment is verified by the facilitator
// ============================================================================

async function paidHandler(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('meta');
  const listingId = url.pathname.split('/').at(-2) || 'unknown';
  
  if (!metadataUrl) {
    const errorBody: Record<string, unknown> = { error: 'No metadata URL provided. Use ?meta=<ipfs-url>' };
    return NextResponse.json(errorBody, { status: 400 });
  }

  try {
    // Fetch with 5s timeout to prevent slow IPFS gateways from hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const metaResponse = await fetch(metadataUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!metaResponse.ok) {
      throw new Error('Failed to fetch metadata from IPFS');
    }
    const metadata = await metaResponse.json();
    
    return NextResponse.json({
      success: true,
      paidVia: 'x402',
      paidOn: BASE_CHAIN_ID,
      listingId,
      seller: metadata.seller,
      metadataURI: metadataUrl,
      price: metadata.price,
      isOrbVerified: metadata.isOrbVerified,
      settledAt: Date.now(),
    });
  } catch (error) {
    console.error('[x402] Handler error:', error);
    const errorBody: Record<string, unknown> = { error: 'Failed to process request' };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

// ============================================================================
// Dynamic route config — fetches price from IPFS metadata per listing
// This makes the x402 challenge include the correct amount per listing
// ============================================================================

async function getDynamicRouteConfig(request: NextRequest): Promise<RouteConfig> {
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('meta');
  
  // Default fallback config
  const defaultConfig: RouteConfig = {
    price: '$1',
    network: 'base',
    config: {
      description: 'TruCheq listing — payment required',
      maxTimeoutSeconds: 300,
    },
  };
  
  if (!metadataUrl) return defaultConfig;
  
  try {
    // Fetch with 5s timeout to prevent slow IPFS gateways from hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const metaResponse = await fetch(metadataUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!metaResponse.ok) return defaultConfig;
    
    const metadata = await metaResponse.json();
    const price = metadata.price || '1';
    
    return {
      price: formatPriceForX402(price), // e.g., "$300"
      network: 'base',
      config: {
        description: `TruCheq: ${metadata.itemName || 'Listing'} — ${price} USDC`,
        maxTimeoutSeconds: 300,
      },
    };
  } catch {
    return defaultConfig;
  }
}

// ============================================================================
// GET handler — withX402 handles the 402 challenge/payment flow
// 
// Agent flow (via AgentKit, x402-fetch, or any x402 client):
//   1. Agent requests this endpoint → gets 402 with payment requirements
//   2. Agent pays USDC on Base via the x402 facilitator
//   3. Agent retries with payment proof → gets listing data
//
// Human flow (via /pay/[id] page):
//   - Supports World Chain + Base Sepolia via direct USDC transfer
//   - XMTP chat + x402 invoice card for in-chat payments
//
// Architecture note:
//   - Agent x402 payments go to NEXT_PUBLIC_X402_PAY_TO (marketplace treasury)
//   - Human payments go directly to metadata.seller (individual seller)
//   - The treasury must settle with individual sellers (not yet implemented)
//   - World Chain is NOT supported by x402 NetworkSchema — agents can only
//     pay on Base Sepolia. World Chain remains human-only via direct USDC.
// ============================================================================

// Lazily initialize the withX402 wrapper to avoid module-level type unification issues
let cachedHandler: ((req: NextRequest) => Promise<NextResponse>) | null | undefined = undefined;

function getX402Handler() {
  if (cachedHandler !== undefined) return cachedHandler;
  
  if (!PAY_TO) {
    cachedHandler = null;
    return null;
  }

  cachedHandler = withX402(
    paidHandler,
    PAY_TO,
    getDynamicRouteConfig,
    // Facilitator: @coinbase/x402 facilitator (auto-configures for mainnet via CDP credentials)
    // Requires CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY env vars for mainnet.
    // On testnet (base-sepolia) it falls back to the public demo facilitator.
    facilitator as any,
    // Paywall config
    {
      cdpClientKey: process.env.NEXT_PUBLIC_CDP_CLIENT_KEY,
      appName: 'TruCheq',
      appLogo: '/trucheq-logo.jpeg',
    }
  ) as (req: NextRequest) => Promise<NextResponse>;
  
  return cachedHandler;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const handler = getX402Handler();
  
  if (!handler) {
    // Widen error type to avoid NextResponse narrowing to {error: string} generic
    const errorBody: Record<string, unknown> = { error: 'x402 payments not configured — set NEXT_PUBLIC_X402_PAY_TO' };
    return NextResponse.json(errorBody, { status: 503 });
  }
  
  return handler(request);
}
