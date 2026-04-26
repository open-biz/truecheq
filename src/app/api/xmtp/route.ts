import { NextResponse } from 'next/server';
import { getXMTPClient, getOrCreateDm } from '@/lib/xmtp-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, recipientAddress, message, conversationId } = body;
    
    const client = await getXMTPClient();
    
    if (!client) {
      return NextResponse.json(
        { error: 'XMTP not configured - server missing system key' },
        { status: 503 }
      );
    }
    
    switch (action) {
      case 'send': {
        if (!recipientAddress || !message) {
          return NextResponse.json(
            { error: 'Missing recipientAddress or message' },
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
        
        await conversation.sendText(message);
        
        return NextResponse.json({ success: true });
      }
      
      case 'list-conversations': {
        await client.conversations.sync();
        const conversations = await client.conversations.list();
        return NextResponse.json({
          conversations: conversations.map((c: any) => ({
            id: c.id,
            peerAddress: c.peerAddress,
          }))
        });
      }
      
      case 'messages': {
        if (!conversationId) {
          return NextResponse.json(
            { error: 'Missing conversationId' },
            { status: 400 }
          );
        }
        
        await client.conversations.sync();
        const conversations = await client.conversations.list();
        const conversation: any = conversations.find((c: any) => c.id === conversationId);
        
        if (!conversation) {
          return NextResponse.json(
            { error: 'Conversation not found' },
            { status: 404 }
          );
        }
        
        const messages = await conversation.messages();
        
        return NextResponse.json({
          messages: messages.map((m: any) => ({
            id: m.id,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            senderAddress: m.senderAddress,
            sentAt: m.sentAt?.toISOString?.() || new Date().toISOString(),
          }))
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[XMTP API] Error:', error);
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
