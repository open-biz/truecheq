/**
 * Shared XMTP Server Utilities
 * 
 * Common XMTP client initialization, signer creation, and DM management
 * used by both /api/xmtp and /api/xmtp/system-message API routes.
 * 
 * Architecture:
 * - The server XMTP identity is a SYSTEM relay (TruCheq bot), NOT a specific seller.
 * - It sends system notifications (welcome messages, payment confirmations)
 *   to ANY buyer or seller — fully multi-tenant.
 * - Real sellers use their own XMTP identity (via World App, Converse, etc.)
 *   and receive messages from the system relay + buyers directly.
 * 
 * Environment variables:
 * - XMTP_SYSTEM_PRIVATE_KEY: Private key for the TruCheq system XMTP identity
 * - XMTP_SYSTEM_ADDRESS: Derived address of the system identity
 */
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
export const IDENTIFIER_KIND_ETHEREUM = 1;

// Get signer from environment (TruCheq system relay identity — NOT a specific seller)
export function getXmtpSigner() {
  const privateKey = process.env.XMTP_SYSTEM_PRIVATE_KEY || process.env.XMTP_SELLER_PRIVATE_KEY;
  const systemAddress = process.env.XMTP_SYSTEM_ADDRESS || process.env.XMTP_SELLER_ADDRESS;
  
  if (!privateKey || !systemAddress) {
    return null;
  }
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return {
    type: 'EOA' as const,
    getIdentifier: async () => ({
      identifier: systemAddress as `0x${string}`,
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

// ============================================================================
// XMTP Client Singleton
// ============================================================================

let xmtpClient: any = null;
let xmtpClientPromise: Promise<any> | null = null;

/**
 * Get or initialize the XMTP client singleton.
 * Prevents concurrent initialization and handles rejected promises.
 * Uses a persistent DB path so synced conversations survive server restarts.
 */
export async function getXMTPClient(): Promise<any> {
  if (!XMTP_SIGNER) {
    console.error('[XMTP Server] Signer not configured - missing XMTP_SYSTEM_PRIVATE_KEY/XMTP_SYSTEM_ADDRESS (or legacy XMTP_SELLER_PRIVATE_KEY/XMTP_SELLER_ADDRESS)');
    return null;
  }
  
  if (xmtpClient) {
    return xmtpClient;
  }
  
  // Prevent concurrent initialization
  if (xmtpClientPromise) {
    return xmtpClientPromise;
  }
  
  xmtpClientPromise = (async () => {
    const ClientClass = await getClient();
    const dbEncryptionKey = getRandomValues(new Uint8Array(32));
    
    // Persistent DB path so conversations survive restarts
    const systemKey = (process.env.XMTP_SYSTEM_ADDRESS || process.env.XMTP_SELLER_ADDRESS)?.slice(0, 10) || 'default';
    const dbPath = `./xmtp-server-${systemKey}.db3`;
    
    const client = await ClientClass.create(XMTP_SIGNER, {
      dbEncryptionKey,
      dbPath,
    });
    
    xmtpClient = client;
    return client;
  })();
  
  // Clear the promise on rejection so subsequent requests can retry
  xmtpClientPromise.catch(() => {
    xmtpClientPromise = null;
  });
  
  return xmtpClientPromise;
}

// ============================================================================
// DM Conversation Management
// ============================================================================

/**
 * Find or create a DM conversation with a peer address.
 * Tries multiple XMTP node-sdk API variants for compatibility.
 */
export async function getOrCreateDm(client: any, peerAddress: string): Promise<any | null> {
  // Sync conversations first
  try {
    await client.conversations.sync();
  } catch {
    // Sync may fail on first call, continue anyway
  }
  
  // Try to find existing DM
  try {
    const conversations = await client.conversations.list();
    const existing = conversations.find(
      (c: any) => c.peerAddress?.toLowerCase() === peerAddress.toLowerCase()
    );
    if (existing) return existing;
  } catch {
    // Continue to create new
  }
  
  // Create new DM (node-sdk v6 uses createDm with identifier object)
  try {
    const dm = await client.conversations.createDm({
      identifier: peerAddress.toLowerCase(),
      identifierKind: IDENTIFIER_KIND_ETHEREUM,
    });
    return dm;
  } catch {
    // Fallback: try newConversation (older node-sdk API)
    try {
      const dm = await client.conversations.newConversation(peerAddress);
      return dm;
    } catch {
      return null;
    }
  }
}
