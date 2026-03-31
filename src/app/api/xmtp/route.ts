import { NextResponse } from 'next/server';
import { getRandomValues } from 'node:crypto';
import { privateKeyToAccount } from 'viem/accounts';

// Dynamic import to avoid native binding issues at build time
let Client: any = null;
async function getClient() {
  if (!Client) {
    const xmtpModule = await import('@xmtp/node-sdk');
    Client = xmtpModule.Client;
  }
  return Client;
}

// IdentifierKind enum value for Ethereum
const IDENTIFIER_KIND_ETHEREUM = 1;

// Get signer from environment
function getXmtpSigner() {
  const privateKey = process.env.XMTP_SELLER_PRIVATE_KEY;
  const sellerAddress = process.env.XMTP_SELLER_ADDRESS;
  
  if (!privateKey || !sellerAddress) {
    return null;
  }
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return {
    type: 'EOA' as const,
    getIdentifier: async () => ({
      identifier: sellerAddress as `0x${string}`,
      identifierKind: IDENTIFIER_KIND_ETHEREUM,
    }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      const signature = await account.signMessage({ message });
      const hex = (signature as string).slice(2);
      return new Uint8Array(hex.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
    },
  };
}

const XMTP_SIGNER = getXmtpSigner();

export const runtime = 'nodejs';

// Initialize XMTP client (singleton)
let xmtpClient: any = null;

async function getXMTPClient(): Promise<any> {
  if (!XMTP_SIGNER) {
    console.error('[XMTP API] Signer not configured - missing XMTP_SELLER_PRIVATE_KEY or XMTP_SELLER_ADDRESS');
    return null;
  }
  
  if (xmtpClient) {
    return xmtpClient;
  }
  
  const ClientClass = await getClient();
  const dbEncryptionKey = getRandomValues(new Uint8Array(32));
  
  xmtpClient = await ClientClass.create(XMTP_SIGNER, {
    dbEncryptionKey,
    dbPath: './xmtp-db',
  });
  
  return xmtpClient;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, buyerAddress, message, conversationId } = body;
    
    const client = await getXMTPClient();
    
    if (!client) {
      return NextResponse.json(
        { error: 'XMTP not configured - server missing seller key' },
        { status: 503 }
      );
    }
    
    // Use type assertions for XMTP SDK properties
    const xmtp = client as any;
    
    switch (action) {
      case 'send': {
        if (!buyerAddress || !message) {
          return NextResponse.json(
            { error: 'Missing buyerAddress or message' },
            { status: 400 }
          );
        }
        
        // Create or get DM conversation with buyer
        let conversation: any;
        try {
          conversation = await xmtp.conversations.newConversation(buyerAddress);
        } catch {
          // Try to find existing conversation
          const conversations = await xmtp.conversations.list();
          conversation = conversations.find(
            (c: any) => c.peerAddress?.toLowerCase() === buyerAddress.toLowerCase()
          );
        }
        
        if (!conversation) {
          return NextResponse.json(
            { error: 'Could not create conversation' },
            { status: 500 }
          );
        }
        
        // Send message
        await conversation.sendText(message);
        
        return NextResponse.json({ success: true, conversationId: conversation.id });
      }
      
      case 'list-conversations': {
        const conversations = await xmtp.conversations.list();
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
        
        // Get conversation by ID
        const conversations = await xmtp.conversations.list();
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
        message: 'XMTP seller key not configured on server',
      });
    }
    return NextResponse.json({
      address: (client as any).address,
      status: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}