// ============================================================================
// Shared XMTP Types & Helpers
// Used by both ChatTab and XMTPChatInner to avoid duplication
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface OfferPayload {
  customType: 'offer';
  amount: string;
  currency: string;
  itemName: string;
  listingCid?: string;
}

export interface PaymentRequestPayload {
  customType: 'payment-request';
  amount: string;
  currency: string;
  recipient: string;
  chainId: number;
}

export interface PaymentConfirmPayload {
  customType: 'payment-confirm';
  amount: string;
  currency: string;
  txHash: string;
  chainId: number;
}

export interface SystemMessagePayload {
  customType: 'system';
  event: 'payment_sent' | 'payment_confirmed' | 'listing_created' | 'offer_accepted';
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
  type?: 'text' | 'offer' | 'payment-request' | 'payment-confirm' | 'system';
  payload?: OfferPayload | PaymentRequestPayload | PaymentConfirmPayload | SystemMessagePayload;
}

// ============================================================================
// Helpers
// ============================================================================

export function parseMessageContent(content: string): {
  type: ChatMessage['type'];
  payload?: ChatMessage['payload'];
} {
  try {
    const parsed = JSON.parse(content);
    if (parsed.customType === 'offer') {
      return { type: 'offer', payload: parsed as OfferPayload };
    }
    if (parsed.customType === 'payment-request') {
      return { type: 'payment-request', payload: parsed as PaymentRequestPayload };
    }
    if (parsed.customType === 'payment-confirm') {
      return { type: 'payment-confirm', payload: parsed as PaymentConfirmPayload };
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
