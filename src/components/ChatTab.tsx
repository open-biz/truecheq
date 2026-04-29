'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ConsentState, type Dm } from '@xmtp/browser-sdk';
import { getStoredWalletAddress } from '@/lib/wallet-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  User,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Search,
  X,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { payWithMiniKit, canUseMiniKitPay } from '@/lib/payments';
import { loadAgentRules, evaluateOffer, generateAgentReply } from '@/lib/agent';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  type ChatMessage,
  type SystemMessagePayload,
  parseMessageContent,
  truncateAddress,
  formatRelativeTime,
} from '@/lib/xmtp-types';
import { useXMTP } from '@/lib/xmtp-provider';
import { ConnectButton } from '@/components/ConnectButton';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'list' | 'conversation';

interface ConversationPreview {
  dm: Dm;
  peerAddress: string;
  lastMessage: string;
  lastMessageTime: Date;
  hasUnread: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const LAST_READ_KEY = 'trucheq_last_read';

function getLastRead(peerAddress: string): number {
  try {
    const stored = localStorage.getItem(LAST_READ_KEY);
    if (!stored) return 0;
    const map = JSON.parse(stored) as Record<string, number>;
    return map[peerAddress.toLowerCase()] || 0;
  } catch {
    return 0;
  }
}

function setLastRead(peerAddress: string, ts: number): void {
  try {
    const stored = localStorage.getItem(LAST_READ_KEY);
    const map = stored ? JSON.parse(stored) as Record<string, number> : {};
    map[peerAddress.toLowerCase()] = ts;
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// ============================================================================
// Component: Conversation List Item
// ============================================================================

function ConversationItem({
  preview,
  onSelect,
}: {
  preview: ConversationPreview;
  onSelect: (peerAddress: string) => void;
}) {
  const { type } = parseMessageContent(preview.lastMessage);
  const previewText =
    type === 'offer'
      ? '💰 Offer received'
      : type === 'payment-request'
        ? '� Payment requested'
      : type === 'payment-confirm'
        ? '✅ Payment confirmed'
      : type === 'system'
        ? '✅ System message'
        : preview.lastMessage.length > 50
          ? preview.lastMessage.slice(0, 50) + '…'
          : preview.lastMessage;

  return (
    <button
      onClick={() => onSelect(preview.peerAddress)}
      className='w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-white/[0.03] transition-all text-left group active:scale-[0.99]'
    >
      {/* Avatar */}
      <div className='relative flex-shrink-0'>
        <div className='w-14 h-14 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/[0.08] flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.03)]'>
          <User className='w-5 h-5 text-white/40' />
        </div>
        {preview.hasUnread && (
          <div className='absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_rgba(0,214,50,0.4)]' />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-sm font-bold text-white truncate'>
            {truncateAddress(preview.peerAddress)}
          </span>
          <span className='text-[10px] text-white/30 flex-shrink-0 ml-2 font-medium'>
            {formatRelativeTime(preview.lastMessageTime)}
          </span>
        </div>
        <div className='flex items-center gap-1.5'>
          <p className={cn(
            'text-sm truncate',
            preview.hasUnread ? 'text-white font-semibold' : 'text-white/40',
          )}>
            {previewText || 'No messages'}
          </p>
        </div>
      </div>

      <ChevronRight className='w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0' />
    </button>
  );
}

// ============================================================================
// Component: Inline Message Renderer
// ============================================================================

function ChatBubble({ msg, onPay }: { msg: ChatMessage; onPay?: () => void }) {
  // System messages — centered
  if (msg.type === 'system') {
    const payload = msg.payload as SystemMessagePayload | undefined;
    const label = payload?.event === 'payment_confirmed'
      ? `Payment of ${payload.amount || ''} USDC Confirmed`
      : payload?.event === 'payment_sent'
        ? `Payment of ${payload.amount || ''} USDC Sent`
        : payload?.event === 'offer_accepted'
          ? 'Offer Accepted'
          : msg.content;
    return (
      <div className='flex justify-center my-3'>
        <div className='bg-primary/10 border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5'>
          <CheckCircle2 className='w-3 h-3 text-primary' />
          <span className='text-[9px] font-black uppercase tracking-widest text-primary'>
            {label}
          </span>
        </div>
      </div>
    );
  }

  // Offer card
  if (msg.type === 'offer' && msg.payload) {
    const offer = msg.payload as { amount: string; currency: string; itemName: string };
    return (
      <div className='w-full my-2'>
        <div className='bg-card border border-primary/30 rounded-2xl p-3 shadow-[0_4px_12px_rgba(0,214,50,0.1)]'>
          <p className='text-xs font-bold text-white mb-1'>{offer.itemName}</p>
          <p className='text-lg font-black italic tracking-tighter text-primary'>{offer.amount} {offer.currency}</p>
          <p className='text-[10px] text-muted-foreground mt-1'>Offer from buyer</p>
        </div>
      </div>
    );
  }

  // Payment request card
  if (msg.type === 'payment-request' && msg.payload) {
    const req = msg.payload as { amount: string; currency: string; recipient: string };
    return (
      <div className='w-full my-2'>
        <div className='bg-card border border-yellow-500/30 rounded-2xl p-3'>
          <p className='text-xs font-bold text-white mb-1'>Payment Request</p>
          <p className='text-lg font-black italic tracking-tighter text-yellow-400'>{req.amount} {req.currency}</p>
          {!msg.isSelf && onPay && (
            <Button
              size='sm'
              className='w-full mt-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400'
              onClick={onPay}
            >
              <DollarSign className='w-3 h-3 mr-1.5' /> Pay Now
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Payment confirmation card
  if (msg.type === 'payment-confirm' && msg.payload) {
    const conf = msg.payload as { amount: string; currency: string; txHash: string };
    return (
      <div className='w-full my-2'>
        <div className='bg-card border border-primary/30 rounded-2xl p-3'>
          <p className='text-xs font-bold text-primary mb-1'>Payment Sent</p>
          <p className='text-sm font-black text-white'>{conf.amount} {conf.currency}</p>
          <p className='text-[10px] font-mono text-muted-foreground mt-1 truncate'>{conf.txHash}</p>
        </div>
      </div>
    );
  }

  // Text messages
  return (
    <div className={cn('flex w-full items-end gap-2', msg.isSelf ? 'justify-end' : 'justify-start')}>
      {!msg.isSelf && (
        <div className='w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center flex-shrink-0'>
          <User className='w-3 h-3 text-white/30' />
        </div>
      )}
      <div className={cn(
        'max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
        msg.isSelf
          ? 'bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-medium rounded-br-md shadow-[0_4px_12px_rgba(0,214,50,0.15)]'
          : 'bg-card text-white rounded-bl-md shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
      )}>
        <span className='whitespace-pre-wrap break-words'>{msg.content}</span>
      </div>
      {msg.isSelf && (
        <div className='w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center flex-shrink-0'>
          <User className='w-3 h-3 text-white/30' />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN: ChatTab
// ============================================================================

interface ChatTabProps {
  onUnreadChange?: (count: number) => void;
  startChatWith?: string | null;
  onChatStarted?: () => void;
}

export function ChatTab({ onUnreadChange, startChatWith, onChatStarted }: ChatTabProps) {
  const userAddress = getStoredWalletAddress();
  const isConnected = !!userAddress;
  const { client, isLoading, error, initClient, activateClient } = useXMTP();

  // Conversation list state
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c =>
      c.peerAddress.toLowerCase().includes(q) ||
      truncateAddress(c.peerAddress).toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  // Conversation view state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeDm, setActiveDm] = useState<Dm | null>(null);
  const [activePeerAddress, setActivePeerAddress] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Offer / Payment state
  const [offerMode, setOfferMode] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [, setIsPaying] = useState(false);

  // Refs
  const isMountedRef = useRef(true);
  const activeStreamRef = useRef<AsyncIterable<unknown> | null>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const isStreamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Activate XMTP client on first mount (lazy init)
  useEffect(() => {
    activateClient();
    return () => { isMountedRef.current = false; };
  }, [activateClient]);

  // Handle external request to start chat with a specific address
  useEffect(() => {
    if (!startChatWith) return;

    const address = startChatWith.toLowerCase();
    // Check if conversation already exists
    const existing = conversations.find(c => c.peerAddress.toLowerCase() === address);
    if (existing) {
      setActivePeerAddress(address);
      setActiveDm(existing.dm);
      setViewMode('conversation');
      onChatStarted?.();
      return;
    }
    // Start new conversation view (DM created on first message)
    setActivePeerAddress(address);
    setActiveDm(null);
    setMessages([]);
    setViewMode('conversation');
    onChatStarted?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startChatWith]);

  // ============================================================================
  // BUILD CONVERSATION PREVIEWS (using shared client)
  // ============================================================================

  const refreshConversations = useCallback(async (silent = false) => {
    if (!client || !userAddress) return;

    try {
      if (!silent) setIsRefreshing(true);
      await client.conversations.syncAll([ConsentState.Allowed]);
      const dms = await client.conversations.listDms();

      if (!isMountedRef.current) return;

      const previews: ConversationPreview[] = [];

      for (const dm of dms) {
        try {
          const peerIdFn = (dm as { peerInboxId?: () => Promise<string> }).peerInboxId;
          if (!peerIdFn) continue;
          const peerAddr = await peerIdFn();
          if (!peerAddr || peerAddr.toLowerCase() === userAddress.toLowerCase()) continue;

          const msgs = await dm.messages({ limit: BigInt(1) });
          const lastMsg = msgs[0] as { content?: unknown; sentAt?: Date } | undefined;
          const content = lastMsg
            ? (typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content))
            : '';
          const sentAt = (lastMsg as { sentAt?: Date })?.sentAt || new Date(0);

          const lastRead = getLastRead(peerAddr);
          const hasUnread = sentAt.getTime() > lastRead;

          previews.push({
            dm,
            peerAddress: peerAddr,
            lastMessage: content,
            lastMessageTime: sentAt,
            hasUnread,
          });
        } catch {
          continue;
        }
      }

      previews.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      setConversations(previews);

      // Report unread count to parent
      const unreadCount = previews.filter(p => p.hasUnread).length;
      onUnreadChange?.(unreadCount);
    } catch (err) {
      console.error('[ChatTab] Refresh error:', err);
    } finally {
      if (isMountedRef.current) setIsRefreshing(false);
    }
  }, [client, userAddress, onUnreadChange]);

  // Refresh when client becomes available
  useEffect(() => {
    if (client) {
      refreshConversations();
    }
  }, [client, refreshConversations]);

  // Background refresh every 30s to keep unread badge current
  useEffect(() => {
    if (!client) return;
    const interval = setInterval(() => {
      refreshConversations(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [client, refreshConversations]);

  // ============================================================================
  // OPEN CONVERSATION
  // ============================================================================

  const openConversation = useCallback(async (peerAddress: string) => {
    if (!client) return;

    // Find the DM in our loaded conversations
    const preview = conversations.find(c => c.peerAddress.toLowerCase() === peerAddress.toLowerCase());
    let dm = preview?.dm;

    if (!dm) {
      // DM not in list — try to create/find it
      try {
        const existingDms = await client.conversations.listDms();
        for (const d of existingDms) {
          try {
            const peerIdFn = (d as { peerInboxId?: () => Promise<string> }).peerInboxId;
            if (peerIdFn) {
              const peerId = await peerIdFn();
              if (peerId.toLowerCase() === peerAddress.toLowerCase()) {
                dm = d;
                break;
              }
            }
          } catch { continue; }
        }

        if (!dm) {
          dm = await client.conversations.createDm(peerAddress.toLowerCase() as `0x${string}`);
        }
      } catch (err) {
        toast.error('Failed to open conversation');
        console.error('[ChatTab] Failed to find/create DM:', err);
        return;
      }
    }

    if (!dm) return;

    setActiveDm(dm);
    setActivePeerAddress(peerAddress);
    setViewMode('conversation');
    setIsLoadingMessages(true);

    try {
      // Mark as read
      setLastRead(peerAddress, Date.now());
      // Update unread state in list
      setConversations(prev => prev.map(c =>
        c.peerAddress.toLowerCase() === peerAddress.toLowerCase()
          ? { ...c, hasUnread: false }
          : c,
      ));

      // Load messages
      const msgs = await dm.messages({ limit: BigInt(50) });
      if (!isMountedRef.current) return;

      const formatted: ChatMessage[] = msgs.map(msg => {
        const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
        const content = typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content);
        const { type, payload } = parseMessageContent(content);
        return {
          id: msgAny.id || Date.now().toString(),
          content,
          senderAddress: msgAny.senderInboxId || '',
          timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
          isSelf: (msgAny.senderInboxId || '').toLowerCase() === (userAddress || '').toLowerCase(),
          status: 'delivered' as const,
          type,
          payload,
        };
      });
      setMessages(formatted);

      // Start streaming new messages
      if (!isStreamingRef.current) {
        try {
          const stream = await dm.stream();
          activeStreamRef.current = stream;
          isStreamingRef.current = true;

          const handleStream = async () => {
            try {
              for await (const msg of stream) {
                if (!isMountedRef.current || !isStreamingRef.current) break;
                const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
                const senderId = msgAny.senderInboxId || '';
                const msgId = msgAny.id || `${Date.now()}-${Math.random()}`;
                const content = typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content);
                const { type, payload } = parseMessageContent(content);

                if (senderId.toLowerCase() !== (userAddress || '').toLowerCase()) {
                  setMessages(prev => {
                    const exists = prev.some(m => m.id === msgId);
                    if (exists) return prev;
                    return [...prev, {
                      id: msgId,
                      content,
                      senderAddress: senderId,
                      timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
                      isSelf: false,
                      status: 'delivered',
                      type,
                      payload,
                    }];
                  });
                  // Mark as read while viewing
                  setLastRead(peerAddress, Date.now());

                  // Agent auto-reply to offers
                  if (type === 'offer' && payload && dm) {
                    const offerPayload = payload as { amount: string; currency: string; itemName: string };
                    const rules = loadAgentRules();
                    const askingPrice = parseFloat(offerPayload.amount) * 1.2; // Approximate asking (no exact listing price in message)
                    const evaluation = evaluateOffer(
                      parseFloat(offerPayload.amount),
                      askingPrice,
                      rules,
                    );

                    if (evaluation.action !== 'review') {
                      // Fire agent reply
                      (async () => {
                        try {
                          const replyText = generateAgentReply(evaluation, offerPayload.itemName);
                          await dm.sendText(replyText);

                          // If accepted, send payment request
                          if (evaluation.action === 'accept') {
                            const paymentRequest = {
                              customType: 'payment-request' as const,
                              amount: offerPayload.amount,
                              currency: offerPayload.currency,
                              recipient: userAddress || '',
                              chainId: 480,
                            };
                            await dm.sendText(JSON.stringify(paymentRequest));
                          }
                        } catch (agentErr) {
                          console.error('[ChatTab] Agent reply error:', agentErr);
                        }
                      })();
                    } else {
                      // Agent queued for review — send notification
                      if (MiniKit.isInstalled()) {
                        try {
                          (MiniKit as any).sendNotifications?.({
                            includedAddresses: [userAddress || ''],
                            notification: {
                              title: 'New offer received',
                              body: `Someone offered $${offerPayload.amount} for "${offerPayload.itemName}". Your agent queued it for review.`,
                              cta_url: typeof window !== 'undefined' ? `${window.location.origin}/app?tab=chat` : '/app?tab=chat',
                            },
                          });
                        } catch (notifyErr) {
                          console.log('[ChatTab] Notification error:', notifyErr);
                        }
                      }
                    }
                  }
                }
              }
            } catch (streamErr) {
              if (isMountedRef.current && isStreamingRef.current) {
                console.log('[ChatTab] Stream ended:', streamErr);
              }
            } finally {
              isStreamingRef.current = false;
              activeStreamRef.current = null;
            }
          };
          handleStream();

          streamCleanupRef.current = () => {
            isStreamingRef.current = false;
            const streamObj = activeStreamRef.current as { end?: () => void } | null;
            if (streamObj?.end) {
              streamObj.end();
            }
            activeStreamRef.current = null;
          };
        } catch (streamErr) {
          console.error('[ChatTab] Stream setup error:', streamErr);
        }
      }
    } catch (err) {
      console.error('[ChatTab] Failed to load messages:', err);
      toast.error('Failed to load messages');
    } finally {
      if (isMountedRef.current) setIsLoadingMessages(false);
    }
  }, [client, conversations, userAddress]);

  // ============================================================================
  // CLOSE CONVERSATION
  // ============================================================================

  const closeConversation = useCallback(() => {
    // Cleanup stream
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
    isStreamingRef.current = false;
    activeStreamRef.current = null;

    setActiveDm(null);
    setActivePeerAddress('');
    setMessages([]);
    setInputValue('');
    setViewMode('list');

    // Refresh conversation list using shared client
    refreshConversations();
  }, [refreshConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      streamCleanupRef.current?.();
    };
  }, []);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isSending || !activeDm) return;

    try {
      setIsSending(true);
      setInputValue('');

      const tempId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: tempId,
        content: text,
        senderAddress: userAddress || '',
        timestamp: new Date(),
        isSelf: true,
        status: 'sending',
        type: 'text',
      }]);

      await activeDm.sendText(text);

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'sent' as const } : m,
      ));

      setTimeout(() => {
        if (isMountedRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, status: 'delivered' as const } : m,
          ));
        }
      }, 1000);

      // Update conversation preview
      setConversations(prev => prev.map(c =>
        c.peerAddress.toLowerCase() === activePeerAddress.toLowerCase()
          ? { ...c, lastMessage: text, lastMessageTime: new Date() }
          : c,
      ));

    } catch (err) {
      console.error('[ChatTab] Send error:', err);
      toast.error('Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isSending, activeDm, activePeerAddress, userAddress]);

  // ============================================================================
  // SEND OFFER
  // ============================================================================

  const sendOffer = useCallback(async () => {
    const amount = offerAmount.trim();
    if (!amount || isSending || !activeDm) return;

    try {
      setIsSending(true);
      const offerPayload = {
        customType: 'offer' as const,
        amount,
        currency: 'USDC',
        itemName: 'Item', // TODO: pass actual item name
      };
      const text = JSON.stringify(offerPayload);

      const tempId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: tempId,
        content: text,
        senderAddress: userAddress || '',
        timestamp: new Date(),
        isSelf: true,
        status: 'sending',
        type: 'offer',
        payload: offerPayload,
      }]);

      await activeDm.sendText(text);

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'sent' as const } : m,
      ));

      setConversations(prev => prev.map(c =>
        c.peerAddress.toLowerCase() === activePeerAddress.toLowerCase()
          ? { ...c, lastMessage: text, lastMessageTime: new Date() }
          : c,
      ));

      setOfferMode(false);
      setOfferAmount('');

    } catch (err) {
      console.error('[ChatTab] Send offer error:', err);
      toast.error('Failed to send offer');
    } finally {
      setIsSending(false);
    }
  }, [offerAmount, isSending, activeDm, activePeerAddress, userAddress]);

  // ============================================================================
  // HANDLE PAYMENT
  // ============================================================================

  const handlePay = useCallback(async (msg: ChatMessage) => {
    if (!msg.payload || msg.type !== 'payment-request') return;
    const req = msg.payload as { amount: string; currency: string; recipient: string };

    setIsPaying(true);
    try {
      if (canUseMiniKitPay()) {
        // In World App — use native pay
        const result = await payWithMiniKit({
          amount: req.amount,
          recipient: req.recipient,
        });

        if (result.success) {
          toast.success(`Paid ${req.amount} ${req.currency}`);

          // Send payment confirmation back
          const confirmPayload = {
            customType: 'payment-confirm' as const,
            amount: req.amount,
            currency: req.currency,
            txHash: result.txHash || 'pending',
            chainId: 480,
          };
          if (activeDm) {
            await activeDm.sendText(JSON.stringify(confirmPayload));
            // Optimistically add to messages
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              content: JSON.stringify(confirmPayload),
              senderAddress: userAddress || '',
              timestamp: new Date(),
              isSelf: true,
              status: 'sent',
              type: 'payment-confirm',
              payload: confirmPayload,
            }]);
          }
        } else {
          toast.error(result.error || 'Payment failed');
        }
      } else {
        // Standalone — show "use your wallet" instruction
        // TODO: integrate Wagmi for standalone payment
        toast.info('Open in World App to pay natively, or use your wallet');
      }
    } catch (err) {
      console.error('[ChatTab] Payment error:', err);
      toast.error('Payment failed');
    } finally {
      setIsPaying(false);
    }
  }, [activeDm, userAddress]);

  // ============================================================================
  // SCROLL TO BOTTOM
  // ============================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================================
  // KEY HANDLERS
  // ============================================================================

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================================================
  // RENDER: Not connected
  // ============================================================================

  if (!isConnected) {
    const insideWorldApp = typeof window !== 'undefined' && MiniKit.isInstalled();

    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <h2 className='text-2xl font-black tracking-tight text-white'>Messages</h2>
          <p className='text-sm text-muted-foreground font-bold mt-1'>
            Encrypted XMTP conversations
          </p>
        </div>
        <div className='py-16 text-center'>
          <div className='w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]'>
            <MessageCircle className='w-10 h-10 text-white/40' strokeWidth={2.5} />
          </div>
          {insideWorldApp ? (
            <>
              <p className='text-xl font-black text-white mb-2'>Sign in Required</p>
              <p className='text-sm text-white/40 mb-8 max-w-[260px] mx-auto'>
                Please sign in with your wallet inside World App to use chat
              </p>
            </>
          ) : (
            <>
              <p className='text-xl font-black text-white mb-2'>Wallet Required</p>
              <p className='text-sm text-white/40 mb-8 max-w-[240px] mx-auto'>
                Connect your wallet to start encrypted XMTP conversations
              </p>
              <div className='max-w-xs mx-auto'>
                <ConnectButton />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Conversation View
  // ============================================================================

  if (viewMode === 'conversation' && activeDm) {
    return (
      <div className='flex flex-col h-[calc(100vh-8rem)]'>
        {/* Conversation Header */}
        <div className='flex items-center gap-3 p-4 bg-card/90 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)]'>
          <Button
            variant='ghost'
            size='sm'
            onClick={closeConversation}
            className='h-9 w-9 p-0 rounded-full hover:bg-white/[0.06] transition-all active:scale-95'
          >
            <ArrowLeft className='w-4 h-4' />
          </Button>

          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/[0.08] flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.05)]'>
            <User className='w-5 h-5 text-white/40' />
          </div>

          <div className='flex-1 min-w-0'>
            <h3 className='text-sm font-bold text-white truncate'>
              {truncateAddress(activePeerAddress)}
            </h3>
            <span className='text-[9px] font-black uppercase tracking-widest text-primary/70'>
              XMTP Encrypted
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background/60 to-transparent'>
          {isLoadingMessages ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-6 h-6 animate-spin text-primary' />
            </div>
          ) : messages.length === 0 ? (
            <div className='text-center py-16'>
              <div className='w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center justify-center'>
                <MessageCircle className='w-7 h-7 text-primary/30' strokeWidth={2} />
              </div>
              <p className='text-base font-bold text-white mb-1'>No messages yet</p>
              <p className='text-xs text-white/30'>Send a message to start the conversation</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <ChatBubble msg={msg} onPay={msg.type === 'payment-request' ? () => handlePay(msg) : undefined} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='p-4 bg-card/90 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.2)]'>
          {offerMode ? (
            <div className='flex gap-2 items-center'>
              <Input
                type="number"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                placeholder='Offer amount (USDC)...'
                disabled={isSending}
                className='bg-black/40 border-transparent text-sm text-white placeholder:text-white/30 h-10 flex-1 rounded-xl focus:ring-1 focus:ring-primary/30'
              />
              <Button
                onClick={sendOffer}
                disabled={!offerAmount.trim() || isSending}
                size='sm'
                className='bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded-xl font-black transition-all active:scale-95'
              >
                {isSending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Tag className='w-4 h-4' />}
              </Button>
              <Button
                onClick={() => { setOfferMode(false); setOfferAmount(''); }}
                size='sm'
                variant='ghost'
                className='h-10 px-2 rounded-xl hover:bg-white/[0.06] transition-all'
              >
                <X className='w-4 h-4 text-white/40' />
              </Button>
            </div>
          ) : (
            <div className='flex gap-2 items-center'>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder='Type a message...'
                disabled={isSending}
                className='bg-black/40 border-transparent text-sm text-white placeholder:text-white/30 h-10 flex-1 rounded-xl focus:ring-1 focus:ring-primary/30'
              />
              <Button
                onClick={() => setOfferMode(true)}
                size='sm'
                variant='ghost'
                className='h-10 px-3 rounded-xl text-white/40 hover:text-primary hover:bg-white/[0.06] transition-all active:scale-95'
                title='Make Offer'
              >
                <Tag className='w-4 h-4' />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isSending}
                size='sm'
                className='bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded-xl font-black transition-all active:scale-95'
              >
                {isSending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Conversation List
  // ============================================================================

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-black tracking-tight text-white'>Messages</h2>
          <p className='text-sm text-muted-foreground font-bold'>
            {conversations.length > 0
              ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
              : 'Encrypted XMTP conversations'}
          </p>
        </div>
        {client && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => refreshConversations()}
            disabled={isRefreshing}
            className='h-8 w-8 p-0 rounded-full hover:bg-white/10'
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Loading (from shared provider) */}
      {isLoading && !client && (
        <div className='flex flex-col items-center justify-center py-16'>
          <Loader2 className='w-8 h-8 animate-spin text-primary mb-4' />
          <p className='text-sm text-muted-foreground'>Connecting to XMTP...</p>
        </div>
      )}

      {/* Error (from shared provider) */}
      {error && (
        <div className='p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-center'>
          <AlertCircle className='w-8 h-8 mx-auto mb-2 text-destructive' />
          <p className='text-sm font-bold text-white mb-1'>Connection Failed</p>
          <p className='text-xs text-red-400 mb-3'>{error}</p>
          <Button
            size='sm'
            variant='outline'
            onClick={initClient}
            className='border-white/20'
          >
            <RefreshCw className='w-3 h-3 mr-1.5' /> Retry
          </Button>
        </div>
      )}

      {/* Search / Filter */}
      {client && !isLoading && conversations.length > 0 && (
        <div className='relative'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30' />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search by address...'
            className='bg-card text-sm text-white placeholder:text-white/25 h-10 pl-12 pr-10 rounded-2xl focus:ring-1 focus:ring-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
      )}

      {/* Conversations */}
      {client && !isLoading && conversations.length > 0 && (
        filteredConversations.length > 0 ? (
          <div className='space-y-1'>
            {filteredConversations.map(preview => (
              <ConversationItem
                key={preview.peerAddress}
                preview={preview}
                onSelect={openConversation}
              />
            ))}
          </div>
        ) : (
          <div className='py-12 text-center'>
            <Search className='w-10 h-10 mx-auto mb-3 text-white/15' />
            <p className='text-base font-bold text-white mb-1'>No results</p>
            <p className='text-xs text-white/25'>
              No conversations match &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          </div>
        )
      )}

      {/* Empty State (no conversations at all) */}
      {client && !isLoading && conversations.length === 0 && (
        <div className='py-16 text-center'>
          <div className='w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]'>
            <MessageCircle className='w-10 h-10 text-white/25' strokeWidth={2} />
          </div>
          <p className='text-xl font-black text-white mb-2'>No conversations yet</p>
          <p className='text-sm text-white/30 max-w-[260px] mx-auto mb-6'>
            Start chatting with sellers when you view a listing
          </p>
          <Link href='/?tab=buy' className='inline-block'>
            <Button className='rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 px-6 h-11 shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-95'>
              Browse Listings
            </Button>
          </Link>
        </div>
      )}

      {/* Not connected yet — show connect prompt */}
      {!client && !isLoading && !error && (
        <div className='py-16 text-center'>
          <div className='w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]'>
            <MessageCircle className='w-10 h-10 text-white/25' strokeWidth={2} />
          </div>
          <p className='text-xl font-black text-white mb-2'>XMTP Chat</p>
          <p className='text-sm text-white/30 max-w-[260px] mx-auto mb-6'>
            Connect your wallet to start encrypted messaging
          </p>
          <Button
            onClick={initClient}
            className='rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 px-8 h-11 shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-95'
          >
            <RefreshCw className='w-4 h-4 mr-2' /> Connect XMTP
          </Button>
        </div>
      )}
    </div>
  );
}
