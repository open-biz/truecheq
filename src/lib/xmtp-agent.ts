/**
 * TruCheq P2P XMTP Agent (Demo Seller)
 * 
 * This runs as a standalone process to handle a DEMO seller's XMTP identity.
 * It's a lightweight relay — NOT an AI chatbot. The seller is a real human
 * who responds via their XMTP client (Converse, Coinbase Wallet, World App).
 * 
 * Architecture note:
 * - This agent is for the DEMO seller only. In production, each real seller
 *   uses their own XMTP identity (via World App, Converse, etc.) directly.
 * - The server-side system relay (xmtp-server.ts) sends notifications
 *   (welcome messages, payment confirmations) to ANY seller or buyer —
 *   it's multi-tenant and uses XMTP_SYSTEM_PRIVATE_KEY, not a specific seller key.
 * 
 * What this agent does:
 * 1. Sends a welcome message when a new buyer starts a DM
 * 2. Relays system messages (payment confirmations, invoice notifications)
 * 3. Logs incoming messages for the seller's dashboard
 * 
 * What this agent does NOT do:
 * - AI-generated responses (removed — this is P2P, not bot-mediated)
 * - Automatic invoice sending (seller does this manually from the UI)
 * 
 * Environment variables:
 * - XMTP_WALLET_KEY: Private key of the demo seller wallet
 * - XMTP_DB_ENCRYPTION_KEY: 32-byte hex key for DB encryption
 * - NEXT_PUBLIC_XMTP_ENV: 'dev' or 'production'
 * - NEXT_PUBLIC_BASE_URL: Base URL for generating payment links
 */
import 'dotenv-defaults/config';
import { Agent } from '@xmtp/agent-sdk';

const XMTP_ENV = process.env.NEXT_PUBLIC_XMTP_ENV || 'dev';

// ============================================================================
// TYPES
// ============================================================================

/** System message payloads sent programmatically (e.g., payment confirmations) */
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

// ============================================================================
// HELPERS
// ============================================================================

/** Parse a message to check if it's a structured system payload */
function parseSystemPayload(content: string): SystemPayload | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.customType === 'system') {
      return parsed as SystemPayload;
    }
  } catch {
    // Not JSON, regular text
  }
  return null;
}

/** Check if a message is an x402 invoice payload */
function isInvoicePayload(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed.customType === 'x402-invoice';
  } catch {
    return false;
  }
}

// ============================================================================
// AGENT CREATION
// ============================================================================

async function createAgent() {
  console.log(`[P2P Agent] Environment: ${XMTP_ENV}`);

  const dbPath = process.env.XMTP_DB_PATH || `./xmtp-p2p-${XMTP_ENV}-${process.env.XMTP_WALLET_KEY?.slice(0, 10) || 'default'}.db3`;
  console.log(`[P2P Agent] Database path: ${dbPath}`);

  const agent = await Agent.createFromEnv({
    appVersion: 'trucheq-p2p-v1',
    env: XMTP_ENV as 'dev' | 'production',
    dbPath,
  });

  return agent;
}

// ============================================================================
// MAIN: Start P2P Agent
// ============================================================================

export async function startSellerAgent() {
  const agent = await createAgent();
  
  const agentAddress = (agent as any).address;
  console.log(`[P2P Agent] Seller address: ${agentAddress}`);
  console.log(`[P2P Agent] Mode: Human-to-Human P2P (no AI responses)`);

  // ---- Handle incoming text messages ----
  // Log them for the seller; no AI auto-response
  agent.on('text', async (ctx) => {
    const message = ctx.message.content;
    const sender = (ctx.message as any).senderAddress || 'unknown';
    
    // Check if this is a system message (from our own server)
    const systemPayload = parseSystemPayload(message);
    if (systemPayload) {
      console.log(`[P2P Agent] System message relayed: ${systemPayload.event} from ${sender}`);
      // System messages are already visible in the chat — no action needed
      return;
    }

    // Check if this is an x402 invoice (from seller via UI)
    if (isInvoicePayload(message)) {
      console.log(`[P2P Agent] x402 invoice relayed from ${sender}`);
      return;
    }

    // Regular buyer message — just log it
    console.log(`[P2P Agent] Buyer message from ${sender}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    // Do NOT auto-respond. The seller is a real human who will reply manually
    // via their XMTP client (Converse, Coinbase Wallet, World App, etc.)
  });

  // ---- Handle new DMs (first message from a buyer) ----
  // Send a brief welcome message so the buyer knows they're connected
  agent.on('dm', async (ctx) => {
    const dmCtx = ctx as any;
    const sender = dmCtx.message?.senderAddress || 'unknown';
    console.log(`[P2P Agent] New DM from buyer: ${sender}`);
    
    await ctx.conversation.sendText(
      `👋 Welcome to TruCheq! You're now connected with a World ID verified seller.\n\n` +
      `They'll respond to your messages shortly. If they send a payment request, ` +
      `you'll see a secure x402 invoice card right here in the chat.\n\n` +
      `🔒 All messages are end-to-end encrypted via XMTP.`
    );
  });

  // ---- Handle group messages ----
  agent.on('group', async (ctx) => {
    const groupCtx = ctx as any;
    console.log(`[P2P Agent] Group message from ${groupCtx.message?.senderAddress || 'unknown'}`);
  });

  // ---- Handle errors ----
  agent.on('unhandledError', (error) => {
    console.error('[P2P Agent] Unhandled error:', error);
  });

  // ---- Start the agent ----
  await agent.start();
  
  console.log(`[P2P Agent] ✅ P2P Seller agent started!`);
  console.log(`[P2P Agent] Address: ${agentAddress}`);
  console.log(`[P2P Agent] Listening for messages on ${XMTP_ENV} network`);
  console.log(`[P2P Agent] Send a message to this address on XMTP (dev network) to test!`);

  return agent;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startSellerAgent().catch(console.error);
}
