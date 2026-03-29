import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from '@/lib/chains';

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"listings","outputs":[{"internalType":"address","name":"sellerWallet","type":"address"},{"internalType":"string","name":"metadataURI","type":"string"},{"internalType":"uint256","name":"priceUSDC","type":"uint256"},{"internalType":"bool","name":"isOrbVerified","type":"bool"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  try {
    const listing = await client.readContract({
      address: REGISTRY_ADDRESS as `0x${string}`,
      abi: ABI,
      functionName: 'listings',
      args: [BigInt(id)],
    });

    const [sellerWallet, metadataURI, priceUSDC, isOrbVerified, isActive] = listing;

    return NextResponse.json({
      id,
      seller: sellerWallet,
      metadataURI,
      price: priceUSDC.toString(),
      isOrbVerified,
      isActive,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Listing not found or internal error" },
      { status: 500 }
    );
  }
}
