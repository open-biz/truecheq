import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from 'x402-next';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from '@/lib/chains';

const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const PAY_TO = (process.env.NEXT_PUBLIC_X402_PAY_TO || '0x0000000000000000000000000000000000000001') as `0x${string}`;

const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"listings","outputs":[{"internalType":"address","name":"sellerWallet","type":"address"},{"internalType":"string","name":"metadataURI","type":"string"},{"internalType":"uint256","name":"priceUSDC","type":"uint256"},{"internalType":"bool","name":"isOrbVerified","type":"bool"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
] as const;

type HandlerResponse = {
  success: true;
  paidVia: string;
  listingId: string;
  seller: string;
  metadataURI: string;
  price: string;
  isOrbVerified: boolean;
  isActive: boolean;
  settledAt: number;
};

const handler = async (request: NextRequest): Promise<NextResponse<HandlerResponse>> => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = segments[3];

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  try {
    const listing = await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: ABI,
      functionName: 'listings',
      args: [BigInt(id)],
    });

    const [sellerWallet, metadataURI, priceUSDC, isOrbVerified, isActive] = listing;

    return NextResponse.json({
      success: true,
      paidVia: 'x402',
      listingId: id,
      seller: sellerWallet,
      metadataURI,
      price: priceUSDC.toString(),
      isOrbVerified,
      isActive,
      settledAt: Date.now(),
    });
  } catch (error) {
    console.error('x402 API error:', error);
    // Throw error instead of returning error response for x402 compatibility
    throw new Error('Listing not found or contract error');
  }
};

export const GET = withX402(
  handler,
  PAY_TO,
  {
    price: '$0.01',
    network: 'base-sepolia',
    config: {
      description: 'TruCheq listing purchase — paid via x402 protocol',
    },
  }
);
