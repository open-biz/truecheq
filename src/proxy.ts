import { NextRequest, NextResponse } from 'next/server';
import { toUSDCUnits } from '@/lib/x402';

// Dynamic x402 proxy - fetches listing metadata and routes payment to seller
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Only protect /pay/api routes, not the UI page (/pay/[id])
  // Allow the payment page UI to render - user connects wallet to pay
  if (!pathname.startsWith('/pay/api/')) {
    return;
  }
  
  const url = new URL(request.url);
  const metadataUrl = url.searchParams.get('meta');
  
  // If no metadata URL, skip payment check (allow through)
  if (!metadataUrl) {
    return;
  }
  
  try {
    // Fetch metadata to get seller's address and price
    const metaResponse = await fetch(metadataUrl);
    if (!metaResponse.ok) {
      return;
    }
    const metadata = await metaResponse.json();
    const sellerAddress = metadata.seller;
    
    if (!sellerAddress) {
      return;
    }
    
    // Check for x402 payment proof in headers
    const paymentProof = request.headers.get('x402-payment-proof');
    
    if (!paymentProof) {
      // Convert price to USDC units (6 decimal places)
      const priceUSDC = toUSDCUnits(metadata.price || '0');
      
      const x402Header = `x402 payTo=${sellerAddress}, amount=${priceUSDC}, asset=USDC, network=base-sepolia, description="TruCheq listing payment - ${metadata.price} USDC goes directly to seller ${sellerAddress.slice(0, 6)}..."`;
      
      return new NextResponse('Payment required', {
        status: 402,
        headers: {
          'WWW-Authenticate': x402Header,
          'X-Pay-To': sellerAddress,
          'X-Amount': priceUSDC,
          'X-Amount-Display': metadata.price,
          'X-Asset': 'USDC',
          'X-Network': 'base-sepolia',
        },
      });
    }
    
    // Payment verified - allow request through
    return;
  } catch (error) {
    console.error('x402 proxy error:', error);
    return;
  }
}

export const config = {
  matcher: '/pay/api/:path*',
};