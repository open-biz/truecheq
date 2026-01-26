import { NextRequest, NextResponse } from 'next/server';

const FACILITATOR_URL = 'https://facilitator.cronoslabs.org/v2/x402';
const SELLER_WALLET = process.env.NEXT_PUBLIC_SELLER_WALLET || '';
const USDCE_CONTRACT = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
const NETWORK = process.env.NEXT_PUBLIC_CRONOS_NETWORK || 'cronos-testnet';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const metadataUrl = searchParams.get('meta');
  
  const paymentHeader = request.headers.get('x-payment') || request.headers.get('X-PAYMENT');

  if (!metadataUrl) {
    return NextResponse.json(
      { error: 'Metadata URL required' },
      { status: 400 }
    );
  }

  if (!paymentHeader) {
    return NextResponse.json(
      {
        error: 'Payment Required',
        x402Version: 1,
        paymentRequirements: {
          scheme: 'exact',
          network: NETWORK,
          payTo: SELLER_WALLET,
          asset: USDCE_CONTRACT,
          description: `TruCheq Deal #${id} - Secret Content Access`,
          mimeType: 'application/json',
          maxAmountRequired: '1000000',
          maxTimeoutSeconds: 300,
        },
      },
      { 
        status: 402,
        headers: {
          'X402-Version': '1',
        }
      }
    );
  }

  try {
    const metadata = await fetch(metadataUrl);
    if (!metadata.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch metadata' },
        { status: 500 }
      );
    }

    const dealMetadata = await metadata.json();
    const priceInUSDC = Math.floor(parseFloat(dealMetadata.price) * 1000000);

    const requestBody = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: NETWORK,
        payTo: SELLER_WALLET,
        asset: USDCE_CONTRACT,
        description: `TruCheq Deal #${id} - ${dealMetadata.itemName}`,
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
          reason: verifyData.invalidReason 
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
          reason: settleData.error 
        },
        { status: 402 }
      );
    }
  } catch (error: any) {
    console.error('x402 payment error:', error);
    return NextResponse.json(
      { 
        error: 'Server error processing payment',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
