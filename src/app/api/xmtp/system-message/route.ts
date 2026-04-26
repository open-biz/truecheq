import { NextResponse } from 'next/server';
import { getXMTPClient, getOrCreateDm } from '@/lib/xmtp-server';

export const runtime = 'nodejs';

// System message payload types
interface SystemPaymentConfirmedPayload {
  customType: 'system';
  event: 'payment_confirmed';
  amount: string;
  txHash: string;
  timestamp: number;
}

interface SystemPaymentSentPayload {
  customType: 'system';
  event: 'payment_sent';
  amount: string;
  txHash: string;
  timestamp: number;
}

type SystemPayload = SystemPaymentConfirmedPayload | SystemPaymentSentPayload;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, recipientAddress, payload } = body;
    
    const client = await getXMTPClient();
    
    if (!client) {
      return NextResponse.json(
        { error: 'XMTP not configured - server missing system key' },
        { status: 503 }
      );
    }
    
    switch (action) {
      case 'send-system-message': {
        if (!recipientAddress || !payload) {
          return NextResponse.json(
            { error: 'Missing recipientAddress or payload' },
            { status: 400 }
          );
        }
        
        // Validate payload structure
        const systemPayload = payload as SystemPayload;
        if (systemPayload.customType !== 'system') {
          return NextResponse.json(
            { error: 'Invalid payload - must have customType: system' },
            { status: 400 }
          );
        }
        
        const conversation = await getOrCreateDm(client, recipientAddress);
        
        if (!conversation) {
          return NextResponse.json(
            { error: 'Could not create conversation with recipient' },
            { status: 500 }
          );
        }
        
        // Send system message as JSON
        const messageContent = JSON.stringify(systemPayload);
        await conversation.sendText(messageContent);
        
        console.log(`[XMTP System] Sent ${systemPayload.event} message to ${recipientAddress}`);
        
        return NextResponse.json({ 
          success: true, 
          event: systemPayload.event,
        });
      }
      
      case 'payment-confirmed': {
        // Convenience endpoint for payment confirmation
        if (!recipientAddress || !payload?.amount || !payload?.txHash) {
          return NextResponse.json(
            { error: 'Missing recipientAddress, amount, or txHash' },
            { status: 400 }
          );
        }
        
        const paymentPayload: SystemPaymentConfirmedPayload = {
          customType: 'system',
          event: 'payment_confirmed',
          amount: payload.amount,
          txHash: payload.txHash,
          timestamp: Date.now(),
        };
        
        const conversation = await getOrCreateDm(client, recipientAddress);
        
        if (!conversation) {
          return NextResponse.json(
            { error: 'Could not create conversation with recipient' },
            { status: 500 }
          );
        }
        
        await conversation.sendText(JSON.stringify(paymentPayload));
        
        console.log(`[XMTP System] Payment confirmed: ${payload.amount} USDC to ${recipientAddress}`);
        
        return NextResponse.json({ 
          success: true, 
          event: 'payment_confirmed',
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: send-system-message, payment-confirmed' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[XMTP System API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await getXMTPClient();
    if (!client) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'XMTP system key not configured on server',
      });
    }
    return NextResponse.json({
      address: process.env.XMTP_SYSTEM_ADDRESS || process.env.XMTP_SELLER_ADDRESS,
      status: 'connected',
      capabilities: ['send-system-message', 'payment-confirmed'],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
