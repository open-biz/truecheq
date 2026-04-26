// ============================================================================
// Shared XMTP Types & Helpers
// Used by both ChatTab and XMTPChatInner to avoid duplication
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface X402InvoicePayload {
  customType: 'x402-invoice';
  cid: string;
  amount: string;
  itemName: string;
  itemImage?: string;
  fallback: string;
  payTo: string;
  network: string;
}

export interface SystemMessagePayload {
  customType: 'system';
  event: 'payment_sent' | 'payment_confirmed' | 'listing_created';
  amount?: string;
  txHash?: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: Date;
  isSelf: boolean;
  status?: 'sending' | 'sent' | 'delivered';
  type?: 'text' | 'x402-invoice' | 'system';
  payload?: X402InvoicePayload | SystemMessagePayload;
}

// ============================================================================
// Helpers
// ============================================================================

export function parseMessageContent(content: string): {
  type: 'text' | 'x402-invoice' | 'system';
  payload?: X402InvoicePayload | SystemMessagePayload;
} {
  try {
    const parsed = JSON.parse(content);
    if (parsed.customType === 'x402-invoice') {
      return { type: 'x402-invoice', payload: parsed as X402InvoicePayload };
    }
    if (parsed.customType === 'system') {
      return { type: 'system', payload: parsed as SystemMessagePayload };
    }
  } catch {
    // plain text
  }
  return { type: 'text' };
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
