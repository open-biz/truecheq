import { NextRequest, NextResponse } from 'next/server';
import { toUSDCUnits } from '@/lib/x402';

type HandlerResponse = {
  success: true;
  paidVia: string;
  listingId: string;
  seller: string;
  metadataURI: string;
  price: string;
  isOrbVerified: boolean;
  settledAt: number;
};

// Custom x402 handler with dynamic payment to seller
const handler = async (request: NextRequest): Promise<NextResponse<HandlerResponse>> => {
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('meta');
  // Extract CID from the path (e.g., /deal/Qmxxx?meta=...)
  const pathSegments = url.pathname.split('/');
  const listingId = pathSegments[3] || 'unknown';

  if (!metadataUrl) {
    return NextResponse.json(
      { success: false, error: 'No metadata URL provided. Use ?meta=<ipfs-url>' } as unknown as HandlerResponse,
      { status: 400 }
    );
  }

  try {
    // Fetch metadata to get seller address for payment
    const metaResponse = await fetch(metadataUrl);
    if (!metaResponse.ok) {
      throw new Error('Failed to fetch metadata from IPFS');
    }
    const metadata = await metaResponse.json();
    
    const sellerAddress = metadata.seller;
    const price = metadata.price || '1';
    
    // Check for payment proof
    const paymentProof = request.headers.get('x402-payment-proof') || request.headers.get('authorization');
    
    if (!paymentProof) {
      // Convert price to USDC units (6 decimal places)
      const priceUSDC = toUSDCUnits(price || '0');
      
      // Return 402 with dynamic payment to seller
      return new NextResponse(JSON.stringify({
        error: 'Payment required',
        payTo: sellerAddress,
        price: priceUSDC,
        priceDisplay: price,
        network: 'base-sepolia',
        asset: 'USDC',
        description: `TruCheq listing payment - ${price} USDC goes to seller`,
      }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `x402 payTo=${sellerAddress}, amount=${priceUSDC}, asset=USDC, network=base-sepolia`,
        },
      });
    }

    // Payment verified - return listing data
    return NextResponse.json({
      success: true,
      paidVia: 'x402',
      listingId,
      seller: metadata.seller,
      metadataURI: metadataUrl,
      price: metadata.price,
      isOrbVerified: metadata.isOrbVerified,
      settledAt: Date.now(),
    });
  } catch (error) {
    console.error('x402 API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listing from IPFS' } as unknown as HandlerResponse,
      { status: 500 }
    );
  }
};

export const GET = handler;
