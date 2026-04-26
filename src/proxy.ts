import { NextRequest, NextResponse } from 'next/server';
import { toUSDCUnits, WORLD_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, getUSDCAddress, getChainName } from '@/lib/x402';

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
      
      // Support both World Chain and Base Sepolia
      const x402Headers = [
        `x402 scheme=exact, network=${WORLD_CHAIN_ID}, amount=${priceUSDC}, asset=${getUSDCAddress(WORLD_CHAIN_ID)}, payTo=${sellerAddress}, description="Pay via World Chain"`,
        `x402 scheme=exact, network=${BASE_SEPOLIA_CHAIN_ID}, amount=${priceUSDC}, asset=${getUSDCAddress(BASE_SEPOLIA_CHAIN_ID)}, payTo=${sellerAddress}, description="Pay via Base Sepolia"`,
      ].join(', ');
      
      return new NextResponse('Payment required', {
        status: 402,
        headers: {
          'WWW-Authenticate': x402Headers,
          'X-Pay-To': sellerAddress,
          'X-Amount': priceUSDC,
          'X-Amount-Display': metadata.price,
          'X-Asset': getUSDCAddress(BASE_SEPOLIA_CHAIN_ID),
          'X-Network': BASE_SEPOLIA_CHAIN_ID,
          'X-Accepted-Networks': `${WORLD_CHAIN_ID},${BASE_SEPOLIA_CHAIN_ID}`,
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