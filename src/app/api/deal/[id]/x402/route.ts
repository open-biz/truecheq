import { NextRequest, NextResponse } from 'next/server';
import { formatPriceForX402, BASE_SEPOLIA_CHAIN_ID, WORLD_CHAIN_ID, getUSDCAddress } from '@/lib/x402';

// Supported chains in order of preference (World Chain first for agent traffic)
const SUPPORTED_NETWORKS = [WORLD_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID];

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
      // No payment - return 402 with MULTIPLE x402 headers for both supported chains
      // Client can choose which chain to pay on
      // Format: x402 scheme=exact, network=eip155:480, amount=$price, asset=USDC, payTo=seller
      
      // Build WWW-Authenticate with multiple schemes (one per chain)
      const x402Headers = SUPPORTED_NETWORKS.map(network => 
        `x402 scheme=exact, network=${network}, amount=${priceFormatted}, asset=${getUSDCAddress(network)}, payTo=${sellerAddress}`
      ).join(', ');
      
      return new NextResponse(JSON.stringify({
        error: 'Payment required',
        scheme: 'exact',
        price: priceFormatted,
        networks: SUPPORTED_NETWORKS,
        networkNames: ['World Chain', 'Base Sepolia'],
        assets: SUPPORTED_NETWORKS.map(n => ({ network: n, asset: getUSDCAddress(n) })),
        payTo: sellerAddress,
        maxTimeoutSeconds: 300,
        description: `TruCheq listing: ${metadata.itemName} - ${price} USDC`,
      }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': x402Headers,
          'X-Accepted-Networks': SUPPORTED_NETWORKS.join(','),
        },
      });
    }

    // Payment proof present - verify and return listing data
    // In production, you'd verify the proof with the facilitator
    // For now, we assume proof is valid if present
    
    // Determine which chain was used from the proof
    const paidChain = paymentProof.includes('world') ? WORLD_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;
    
    return NextResponse.json({
      success: true,
      paidVia: 'x402',
      paidOn: paidChain,
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