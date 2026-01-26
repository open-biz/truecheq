import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { cronosTestnet } from '@/lib/chains';

const REGISTRY_ADDRESS = '0xAC50c91ced2122EE2E2c7310b279387e0cA1cF91';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"string","name":"metadataCid","type":"string"},{"internalType":"uint256","name":"createdAt","type":"uint256"}],"stateMutability":"view","type":"function"},
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = createPublicClient({
    chain: cronosTestnet,
    transport: http(),
  });

  try {
    const deal = await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: ABI,
      functionName: 'deals',
      args: [BigInt(id)],
    });

    const [seller, price, metadataCid, createdAt] = deal;

    return NextResponse.json({
        id,
        seller,
        price: price.toString(),
        metadataCid,
        createdAt: createdAt.toString(),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Deal not found or internal error" },
      { status: 500 }
    );
  }
}