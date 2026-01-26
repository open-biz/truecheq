import { NextRequest, NextResponse } from 'next/server';

const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';
const SELLER_WALLET = process.env.NEXT_PUBLIC_SELLER_WALLET || '';
const USDCE_CONTRACT_TESTNET = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
const USDCE_CONTRACT_MAINNET = '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const metadataUrl = searchParams.get('meta');

    if (!dealId || !metadataUrl) {
      return NextResponse.json(
        { error: 'Missing dealId or metadata URL' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { paymentHeader, chainId } = body;

    if (!paymentHeader) {
      return NextResponse.json(
        { error: 'Payment header required' },
        { status: 400 }
      );
    }

    const metadata = await fetch(decodeURIComponent(metadataUrl));
    if (!metadata.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch metadata' },
        { status: 500 }
      );
    }

    const dealMetadata = await metadata.json();
    const priceInUSDC = Math.floor(parseFloat(dealMetadata.price) * 1000000);
    
    const isTestnet = chainId === 338;
    const network = isTestnet ? 'cronos-testnet' : 'cronos';
    const usdcContract = isTestnet ? USDCE_CONTRACT_TESTNET : USDCE_CONTRACT_MAINNET;

    const requestBody = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: network,
        payTo: SELLER_WALLET,
        asset: usdcContract,
        description: `TruCheq Deal #${dealId} - ${dealMetadata.itemName}`,
        mimeType: 'application/json',
        maxAmountRequired: priceInUSDC.toString(),
        maxTimeoutSeconds: 300,
      },
    };

    const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X402-Version': '1',
      },
      body: JSON.stringify(requestBody),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 402 }
      );
    }

    const verifyData = await verifyRes.json();

    if (!verifyData.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid payment',
          reason: verifyData.invalidReason,
        },
        { status: 402 }
      );
    }

    const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X402-Version': '1',
      },
      body: JSON.stringify(requestBody),
    });

    if (!settleRes.ok) {
      return NextResponse.json(
        { error: 'Payment settlement failed' },
        { status: 402 }
      );
    }

    const settleData = await settleRes.json();

    if (settleData.event === 'payment.settled') {
      return NextResponse.json({
        success: true,
        secret: dealMetadata.secret,
        metadata: dealMetadata,
        payment: {
          txHash: settleData.txHash,
          from: settleData.from,
          to: settleData.to,
          value: settleData.value,
          blockNumber: settleData.blockNumber,
          timestamp: settleData.timestamp,
        },
      });
    } else {
      return NextResponse.json(
        {
          error: 'Payment settlement failed',
          reason: settleData.error,
        },
        { status: 402 }
      );
    }
  } catch (error: any) {
    console.error('Cronos settlement error:', error);
    return NextResponse.json(
      {
        error: 'Server error processing payment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
