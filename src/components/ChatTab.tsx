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
  ShieldCheck,
  User,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type ChatMessage,
  type X402InvoicePayload,
  type SystemMessagePayload,
  parseMessageContent,
  truncateAddress,
  formatRelativeTime,
} from '@/lib/xmtp-types';
import { useXMTP } from '@/lib/xmtp-provider';

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
    type === 'x402-invoice'
      ? '📄 Invoice received'
      : type === 'system'
        ? '✅ System message'
        : preview.lastMessage.length > 50
          ? preview.lastMessage.slice(0, 50) + '…'
          : preview.lastMessage;

  return (
    <button
      onClick={() => onSelect(preview.peerAddress)}
      className='w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group'
    >
      {/* Avatar */}
      <div className='relative flex-shrink-0'>
        <div className='w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center'>
          <User className='w-5 h-5 text-white/50' />
        </div>
        {preview.hasUnread && (
          <div className='absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-[#0A0F14]' />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between mb-0.5'>
          <span className='text-sm font-bold text-white truncate'>
            {truncateAddress(preview.peerAddress)}
          </span>
          <span className='text-[10px] text-muted-foreground flex-shrink-0 ml-2'>
            {formatRelativeTime(preview.lastMessageTime)}
          </span>
        </div>
        <div className='flex items-center gap-1.5'>
          <p className={cn(
            'text-xs truncate',
            preview.hasUnread ? 'text-white font-semibold' : 'text-muted-foreground',
          )}>
            {previewText || 'No messages'}
          </p>
        </div>
      </div>

      <ChevronRight className='w-4 h-4 text-muted-foreground/40 group-hover:text-white/40 transition-colors flex-shrink-0' />
    </button>
  );
}

// ============================================================================
// Component: Inline Message Renderer
// ============================================================================

function ChatBubble({ msg, onPayFromInvoice }: {
  msg: ChatMessage;
  onPayFromInvoice: (cid: string, metaUrl?: string) => void;
}) {
  // System messages — centered
  if (msg.type === 'system') {
    const payload = msg.payload as SystemMessagePayload | undefined;
    const label = payload?.event === 'payment_confirmed'
      ? `Payment of ${payload.amount || ''} USDC Confirmed`
      : payload?.event === 'payment_sent'
        ? `Payment of ${payload.amount || ''} USDC Sent`
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

  // Invoice card
  if (msg.type === 'x402-invoice' && msg.payload) {
    const inv = msg.payload as X402InvoicePayload;
    return (
      <div className='w-full my-2'>
        <div className='bg-[#101820] border border-primary/30 rounded-2xl p-3 shadow-[0_4px_12px_rgba(0,214,50,0.1)]'>
          <div className='flex items-center gap-3 mb-3'>
            {inv.itemImage ? (
              <img src={getProxiedImageUrl(inv.itemImage)} alt={inv.itemName} className='w-10 h-10 rounded-lg object-cover border border-white/10' />
            ) : (
              <div className='w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center'>
                <DollarSign className='w-5 h-5 text-primary/40' />
              </div>
            )}
            <div className='flex-1'>
              <p className='text-xs font-bold text-white'>{inv.itemName}</p>
              <p className='text-lg font-black italic tracking-tighter text-primary'>{inv.amount} USDC</p>
            </div>
          </div>
          {!msg.isSelf && (
            <Button
              onClick={() => onPayFromInvoice(inv.cid)}
              size='sm'
              className='w-full bg-primary text-black font-bold rounded-xl hover:bg-primary/90'
            >
              <ShieldCheck className='w-3 h-3 mr-1.5' /> Pay Now
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Text messages
  return (
    <div className={cn('flex w-full items-end gap-1.5', msg.isSelf ? 'justify-end' : 'justify-start')}>
      {!msg.isSelf && (
        <div className='w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0'>
          <User className='w-2.5 h-2.5 text-white/60' />
        </div>
      )}
      <div className={cn(
        'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm',
        msg.isSelf
          ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-sm'
          : 'bg-white/10 text-white rounded-bl-sm border border-white/5',
      )}>
        <span className='whitespace-pre-wrap break-words'>{msg.content}</span>
      </div>
      {msg.isSelf && (
        <div className='w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0'>
          <User className='w-2.5 h-2.5 text-white/60' />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN: ChatTab
// ============================================================================

export function ChatTab({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const router = useRouter();
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
  // HANDLE PAY FROM INVOICE
  // ============================================================================

  const handlePayFromInvoice = useCallback((cid: string) => {
    const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://parallel-pink-stork.myfilebase.com';
    const metadataUrl = `${gateway}/ipfs/${cid}`;
    router.push(`/pay/${cid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl)}`);
  }, [router]);

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
    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <h2 className='text-2xl font-black tracking-tight text-white'>Messages</h2>
          <p className='text-sm text-muted-foreground font-bold mt-1'>
            Encrypted XMTP conversations
          </p>
        </div>
        <div className='py-16 text-center'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center'>
            <MessageCircle className='w-8 h-8 text-muted-foreground' />
          </div>
          <p className='text-white font-bold mb-1'>Wallet Required</p>
          <p className='text-sm text-muted-foreground'>
            Connect your wallet to view messages
          </p>
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
        <div className='flex items-center gap-3 p-3 border-b border-white/10 bg-black/40 rounded-t-2xl'>
          <Button
            variant='ghost'
            size='sm'
            onClick={closeConversation}
            className='h-8 w-8 p-0 rounded-full hover:bg-white/10'
          >
            <ArrowLeft className='w-4 h-4' />
          </Button>

          <div className='w-9 h-9 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center'>
            <User className='w-4 h-4 text-white/50' />
          </div>

          <div className='flex-1 min-w-0'>
            <h3 className='text-sm font-bold text-white truncate'>
              {truncateAddress(activePeerAddress)}
            </h3>
            <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
              XMTP Encrypted
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-black/40 to-black/20'>
          {isLoadingMessages ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-6 h-6 animate-spin text-primary' />
            </div>
          ) : messages.length === 0 ? (
            <div className='text-center py-12'>
              <div className='w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center'>
                <MessageCircle className='w-6 h-6 text-primary/40' />
              </div>
              <p className='text-sm text-white font-bold'>No messages yet</p>
              <p className='text-xs text-muted-foreground'>Start the conversation</p>
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
                  <ChatBubble msg={msg} onPayFromInvoice={handlePayFromInvoice} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='p-3 border-t border-white/10 bg-black/60'>
          <div className='flex gap-2 items-center'>
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder='Type a message...'
              disabled={isSending}
              className='bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/50 h-9 flex-1'
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isSending}
              size='sm'
              className='bg-primary hover:bg-primary/90 h-9 px-3'
            >
              {isSending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
            </Button>
          </div>
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
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60' />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search by address...'
            className='bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/50 h-9 pl-9 pr-9'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white/60 transition-colors'
            >
              <X className='w-3.5 h-3.5' />
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
          <div className='py-8 text-center'>
            <Search className='w-8 h-8 mx-auto mb-2 text-muted-foreground/40' />
            <p className='text-sm text-white font-bold mb-0.5'>No results</p>
            <p className='text-xs text-muted-foreground'>
              No conversations match &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          </div>
        )
      )}

      {/* Empty State (no conversations at all) */}
      {client && !isLoading && conversations.length === 0 && (
        <div className='py-16 text-center'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center'>
            <MessageCircle className='w-8 h-8 text-muted-foreground' />
          </div>
          <p className='text-white font-bold mb-1'>No conversations yet</p>
          <p className='text-sm text-muted-foreground'>
            Chat with sellers when you view a listing
          </p>
          <Link href='/?tab=buy' className='inline-block mt-4'>
            <Button variant='outline' className='rounded-xl border-white/10'>
              Browse All Listings
            </Button>
          </Link>
        </div>
      )}

      {/* Not connected yet — show connect prompt */}
      {!client && !isLoading && !error && (
        <div className='py-16 text-center'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center'>
            <MessageCircle className='w-8 h-8 text-muted-foreground' />
          </div>
          <p className='text-white font-bold mb-1'>XMTP Chat</p>
          <p className='text-sm text-muted-foreground'>
            Connect wallet to start messaging
          </p>
        </div>
      )}
    </div>
  );
}
