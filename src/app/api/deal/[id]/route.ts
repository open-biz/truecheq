import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { cronosTestnet } from '@/lib/chains';

const CONTRACT_ADDRESS = '0x5216905cc7b7fF4738982837030921A22176c8C7';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"isFunded","type":"bool"},{"internalType":"bool","name":"isCompleted","type":"bool"}],"stateMutability":"view","type":"function"},
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
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'deals',
      args: [BigInt(id)],
    });

    const isFunded = deal[3];

    if (isFunded) {
      return NextResponse.json({
        id,
        content: "REVEALED: This is the secret content gated by x402 on Cronos.",
        status: 200
      });
    } else {
      return NextResponse.json(
        { error: "Payment Required", status: 402 },
        { status: 402 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}