import { NextRequest, NextResponse } from 'next/server';
import { formatPriceForX402, BASE_SEPOLIA_CHAIN_ID } from '@/lib/x402';

// Type for the handler response
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

// x402 route - returns listing data AFTER payment is verified
// Clients use @coinbase/x402 to make payment and retry with proof
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('meta');
  
  if (!metadataUrl) {
    return NextResponse.json(
      { error: 'No metadata URL provided. Use ?meta=<ipfs-url>' },
      { status: 400 }
    );
  }

  try {
    // Fetch metadata to get seller address and price for dynamic payment
    const metaResponse = await fetch(metadataUrl);
    if (!metaResponse.ok) {
      throw new Error('Failed to fetch metadata from IPFS');
    }
    const metadata = await metaResponse.json();
    
    const sellerAddress = metadata.seller;
    const price = metadata.price || '1';
    const priceFormatted = formatPriceForX402(price);

    // Check for x402 payment proof in headers
    // The proof is provided by @coinbase/x402 client after successful payment
    const paymentProof = request.headers.get('x402-payment-proof');
    
    if (!paymentProof) {
      // No payment - return 402 with proper x402 header format
      // The x402 header tells the client what payment is required
      // Format: x402 scheme=exact, network=eip155:84532, amount=$price, asset=USDC, payTo=seller
      const x402Header = `x402 scheme=exact, network=${BASE_SEPOLIA_CHAIN_ID}, amount=${priceFormatted}, asset=USDC, payTo=${sellerAddress}`;
      
      return new NextResponse(JSON.stringify({
        error: 'Payment required',
        scheme: 'exact',
        price: priceFormatted,
        network: BASE_SEPOLIA_CHAIN_ID,
        asset: 'USDC',
        payTo: sellerAddress,
        maxTimeoutSeconds: 300,
        description: `TruCheq listing: ${metadata.itemName} - ${price} USDC`,
      }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': x402Header,
        },
      });
    }

    // Payment proof present - verify and return listing data
    // In production, you'd verify the proof with the facilitator
    // For now, we assume proof is valid if present
    
    return NextResponse.json({
      success: true,
      paidVia: 'x402',
      listingId: url.pathname.split('/')[3] || 'unknown',
      seller: metadata.seller,
      metadataURI: metadataUrl,
      price: metadata.price,
      isOrbVerified: metadata.isOrbVerified,
      settledAt: Date.now(),
    });
  } catch (error) {
    console.error('x402 route error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}