'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Copy, 
  Send, 
  Loader2, 
  X, 
  AlertCircle, 
  User, 
  ExternalLink,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Client, IdentifierKind, type Dm } from '@xmtp/browser-sdk';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MiniKit } from '@worldcoin/minikit-js';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { getXMTPEnv } from '@/lib/xmtp';
import {
  type ChatMessage,
  type X402InvoicePayload,
  type SystemMessagePayload,
  parseMessageContent,
} from '@/lib/xmtp-types';
import { useXMTP } from '@/lib/xmtp-provider';
import {
  VerificationBadge,
  Spinner,
  Token,
} from '@worldcoin/mini-apps-ui-kit-react';

// ============================================================================
// TYPES
// ============================================================================

interface XMTPChatInnerProps {
  sellerAddress?: string;
  sellerName?: string;
  sellerPfp?: string;
  isOrbVerified?: boolean;
  listingCid?: string;
  itemName?: string;
  itemPrice?: string;
  itemImage?: string;
  /** Bottom offset for floating elements (default: "1.5rem"). Use "5rem" when a sticky CTA bar is present. */
  bottomOffset?: string;
}

// ============================================================================
// COMPONENT: Trust Header
// ============================================================================

interface TrustHeaderProps {
  sellerName: string;
  sellerAddress: string;
  sellerPfp?: string;
  isOrbVerified: boolean;
  isConnected: boolean;
}

function TrustHeader({ sellerName, sellerAddress, sellerPfp, isOrbVerified, isConnected }: TrustHeaderProps) {
  return (
    <div className='flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-black via-black/80 to-transparent'>
      {/* Seller Avatar with World ID Badge */}
      <div className='relative'>
        {sellerPfp ? (
          <img
            src={getProxiedImageUrl(sellerPfp)}
            alt={sellerName}
            className='w-12 h-12 rounded-full border-2 border-white/20 object-cover'
          />
        ) : (
          <div className='w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/20 flex items-center justify-center'>
            <User className='w-6 h-6 text-white/60' />
          </div>
        )}
        {/* World ID Verification — native VerificationBadge overlay */}
        <div className='absolute -bottom-0.5 -right-0.5'>
          <VerificationBadge verified={isOrbVerified} />
        </div>
      </div>
      
      {/* Seller Info */}
      <div className='flex-1 min-w-0'>
        <h3 className='text-sm font-bold text-white truncate'>
          {sellerName || `Seller ${sellerAddress?.slice(0, 6)}...${sellerAddress?.slice(-4)}`}
        </h3>
        <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
          {isOrbVerified ? 'Orb' : 'Device'} Verified
        </span>
      </div>
      
      {/* Connection Status */}
      {isConnected && (
        <div className='flex items-center gap-1.5'>
          <span className='relative flex h-2 w-2'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-primary'></span>
          </span>
          <span className='text-[10px] text-muted-foreground'>Live</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENT: Message Status Indicator
// ============================================================================

function MessageStatus({ status, isMiniApp }: { status: 'sending' | 'sent' | 'delivered'; isMiniApp: boolean }) {
  const icons = {
    sending: isMiniApp
      ? <Spinner className='w-3 h-3' />
      : <Loader2 className='w-3 h-3 text-muted-foreground animate-spin' />,
    sent: <span className='w-3 h-3 text-muted-foreground text-xs'>✓</span>,
    delivered: <CheckCircle2 className='w-3 h-3 text-primary' />,
  };
  
  return <div className='flex items-center gap-1 ml-2'>{icons[status]}</div>;
}

// ============================================================================
// COMPONENT: System Message
// ============================================================================

function SystemMessage({ content, payload }: { content: string; payload?: SystemMessagePayload }) {
  const getIcon = () => {
    return <CheckCircle2 className='w-4 h-4 text-primary' />;
  };

  const getLabel = () => {
    if (payload?.event === 'payment_confirmed') {
      return `Payment of ${payload.amount || ''} USDC Confirmed on Base`;
    }
    if (payload?.event === 'payment_sent') {
      return `Payment of ${payload.amount || ''} USDC Sent`;
    }
    return content;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className='flex justify-center my-4'
    >
      <div className='bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 flex items-center gap-2'>
        {getIcon()}
        <span className='text-[10px] font-black uppercase tracking-widest text-primary'>
          {getLabel()}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// COMPONENT: x402 Invoice Card
// ============================================================================

interface InvoiceCardProps {
  payload: X402InvoicePayload;
  onPay: (cid: string, metadataUrl?: string) => void;
  isBuyer?: boolean;
  isMiniApp?: boolean;
}

function InvoiceCard({ payload, onPay, isBuyer = true, isMiniApp = false }: InvoiceCardProps) {
  const handlePay = () => {
    const gateway = typeof window !== 'undefined' 
      ? (process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://parallel-pink-stork.myfilebase.com')
      : 'https://parallel-pink-stork.myfilebase.com';
    const metadataUrl = `${gateway}/ipfs/${payload.cid}`;
    onPay(payload.cid, metadataUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className='w-full my-3'
    >
      {/* Glassmorphism Invoice Card */}
      <div className='bg-[#101820] border border-primary/30 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,214,50,0.15)] relative overflow-hidden'>
        {/* Glow effect */}
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent' />
        
        {/* Header */}
        <div className='flex justify-between items-center mb-4 relative'>
          <div className='flex items-center gap-2'>
            <DollarSign className='w-4 h-4 text-primary' />
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
              Official TruCheq Invoice
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='text-[10px] text-muted-foreground'>Base</span>
            <div className='w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center'>
              <span className='text-[8px]'>🔵</span>
            </div>
          </div>
        </div>
        
        {/* Item Details */}
        <div className='flex items-center gap-3 mb-4 relative'>
          {payload.itemImage ? (
            <img 
              src={getProxiedImageUrl(payload.itemImage)} 
              alt={payload.itemName}
              className='w-12 h-12 rounded-lg object-cover border border-white/10'
            />
          ) : (
            <div className='w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center'>
              <DollarSign className='w-6 h-6 text-primary/40' />
            </div>
          )}
          <div className='flex-1'>
            <h4 className='text-sm font-bold text-white'>{payload.itemName}</h4>
            <div className='flex items-center gap-2'>
              {isMiniApp && <Token value='USDC' size={20} />}
              <p className='text-xl font-black italic tracking-tighter text-primary'>
                {payload.amount} USDC
              </p>
            </div>
          </div>
        </div>
        
        {/* Secure Pay Button */}
        {isBuyer && (
          <Button
            onClick={handlePay}
            className='w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,214,50,0.4)] active:scale-[0.98] relative'
          >
            <ShieldCheck className='w-4 h-4 mr-2' />
            Pay Now
            <ChevronRight className='w-4 h-4 ml-2' />
          </Button>
        )}
        
        {/* Fallback for non-TruCheq apps */}
        <div className='mt-3 pt-3 border-t border-white/5 relative'>
          <p className='text-[9px] text-muted-foreground/60 font-mono truncate'>
            {payload.fallback}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT: XMTPChatInner
// ============================================================================

export function XMTPChatInner({ 
  sellerAddress, 
  sellerName,
  sellerPfp,
  isOrbVerified = false,
  listingCid,
  itemName = 'Item',
  itemPrice = '1',
  itemImage,
  bottomOffset = '1.5rem',
}: XMTPChatInnerProps) {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  const { client, isLoading: isProviderLoading, error: providerError, initClient, activateClient } = useXMTP();
  const isMiniApp = MiniKit.isInstalled();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Dm | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [isSellerLoading, setIsSellerLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const isStreamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track DM initialization
  const hasDmInitializedRef = useRef(false);
  const dmInitializedWithSellerRef = useRef<string | null>(null);
  
  // Check if seller address is valid
  const isSellerAddressValid = sellerAddress && sellerAddress.startsWith('0x') && !sellerAddress.includes('abcdef');

  // Activate XMTP client on first mount (lazy init)
  useEffect(() => {
    activateClient();
  }, [activateClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isStreamingRef.current = false;
    };
  }, []);

  // ============================================================================
  // SELLER-SPECIFIC DM INIT (uses shared client from provider)
  // ============================================================================

  useEffect(() => {
    async function initSellerDM() {
      // Skip if already initialized for this seller
      if (hasDmInitializedRef.current && dmInitializedWithSellerRef.current === sellerAddress) {
        return;
      }

      // Reset if seller changed
      if (dmInitializedWithSellerRef.current !== sellerAddress) {
        hasDmInitializedRef.current = false;
      }

      if (!isConnected || !userAddress || !client) {
        return;
      }
      
      if (!isSellerAddressValid) {
        return;
      }

      try {
        setIsSellerLoading(true);
        setSellerError(null);
        
        // Client is already synced by the provider
        
        // Check if seller can receive messages
        let isReachable = false;
        try {
          const identifiers = [{
            identifier: sellerAddress!.toLowerCase() as `0x${string}`,
            identifierKind: IdentifierKind.Ethereum,
          }];
          const canMessageResult = await Client.canMessage(identifiers, getXMTPEnv() as any);
          isReachable = canMessageResult.get(sellerAddress!.toLowerCase()) ?? false;
        } catch {
          setSellerError('Failed to check seller reachability');
          setIsSellerLoading(false);
          return;
        }
        
        if (!isReachable) {
          setSellerError('Seller not on XMTP network yet');
          setIsSellerLoading(false);
          return;
        }
        
        // Find or create DM with seller
        let dm: Dm | undefined;
        const existingDms = await client.conversations.listDms();
        
        for (const d of existingDms) {
          try {
            const peerIdFn = (d as { peerInboxId?: () => Promise<string> }).peerInboxId;
            if (peerIdFn) {
              const peerId = await peerIdFn();
              if (peerId.toLowerCase() === sellerAddress!.toLowerCase()) {
                dm = d;
                break;
              }
            }
          } catch {
            continue;
          }
        }
        
        if (!dm) {
          dm = await client.conversations.createDm(
            sellerAddress!.toLowerCase() as `0x${string}`
          );
        }
        
        if (!dm || !isMountedRef.current) {
          setIsSellerLoading(false);
          return;
        }
        
        setConversation(dm);
        
        // Load existing messages
        const msgs = await dm.messages({ limit: BigInt(50) });
        
        if (!isMountedRef.current) return;
        
        const formattedMessages: ChatMessage[] = msgs.map((msg) => {
          const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
          const content = typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content);
          const { type: messageType, payload } = parseMessageContent(content);
          
          return {
            id: msgAny.id || Date.now().toString(),
            content: content,
            senderAddress: msgAny.senderInboxId || '',
            timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
            isSelf: (msgAny.senderInboxId || '').toLowerCase() === (userAddress || '').toLowerCase(),
            status: 'delivered' as const,
            type: messageType,
            payload,
          };
        });
        setMessages(formattedMessages);
        
        toast.success('Connected to XMTP!');
        
        // Set up real-time message streaming
        if (!isStreamingRef.current) {
          abortControllerRef.current = new AbortController();
          
          try {
            const messageStream = await dm.stream();
            isStreamingRef.current = true;
            
            const handleStream = async () => {
              try {
                for await (const msg of messageStream) {
                  if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) break;
                  
                  const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
                  const senderId = msgAny.senderInboxId || '';
                  const msgId = msgAny.id || `${Date.now()}-${Math.random()}`;
                  
                  if (senderId.toLowerCase() !== (userAddress || '').toLowerCase()) {
                    const content = typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content);
                    const { type: messageType, payload } = parseMessageContent(content);
                    
                    setMessages(prev => {
                      const exists = prev.some(m => 
                        m.id === msgId || 
                        (m.content === content && 
                         Math.abs(m.timestamp.getTime() - (msgAny.sentAt?.getTime() || Date.now())) < 2000)
                      );
                      if (exists) return prev;
                      return [...prev, {
                        id: msgId,
                        content,
                        senderAddress: senderId,
                        timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
                        isSelf: false,
                        status: 'delivered',
                        type: messageType,
                        payload,
                      }];
                    });
                  }
                }
              } catch (streamError) {
                if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
                  console.log('[XMTP] Stream ended:', streamError);
                }
              } finally {
                isStreamingRef.current = false;
              }
            };
            
            handleStream();
            
            streamCleanupRef.current = () => {
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              isStreamingRef.current = false;
            };
          } catch (streamError) {
            console.error('[XMTP] Stream setup error:', streamError);
            isStreamingRef.current = false;
          }
        }
        
        hasDmInitializedRef.current = true;
        dmInitializedWithSellerRef.current = sellerAddress;
      } catch (error) {
        console.error('[XMTP] DM init error:', error);
        if (isMountedRef.current) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to connect';
          setSellerError(errorMsg);
          toast.error('Failed to connect: ' + errorMsg.substring(0, 100));
        }
      } finally {
        if (isMountedRef.current) setIsSellerLoading(false);
      }
    }
    
    initSellerDM();
  }, [client, userAddress, sellerAddress, isConnected, retryKey, isSellerAddressValid]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================
  
  const sendMessage = useCallback(async (text?: string) => {
    const messageContent = text || inputValue.trim();
    if (!messageContent || isSending || !conversation) return;
    
    try {
      setIsSending(true);
      setInputValue('');
      
      const tempId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: tempId,
        content: messageContent,
        senderAddress: userAddress || '',
        timestamp: new Date(),
        isSelf: true,
        status: 'sending',
        type: 'text',
      }]);
      
      await conversation.sendText(messageContent);
      
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' as const } : m
      ));
      
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === tempId ? { ...m, status: 'delivered' as const } : m
        ));
      }, 1000);
      
    } catch (error) {
      console.error('[XMTP] Send error:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  }, [inputValue, conversation, isSending, userAddress]);

  // ============================================================================
  // SEND x402 INVOICE (Seller action)
  // ============================================================================
  
  const sendInvoiceRequest = useCallback(async () => {
    if (!conversation || !listingCid) {
      toast.error('Cannot send invoice - missing listing info');
      return;
    }
    
    const invoicePayload: X402InvoicePayload = {
      customType: 'x402-invoice',
      cid: listingCid,
      amount: itemPrice || '1',
      itemName: itemName || 'Item',
      itemImage: itemImage,
      payTo: sellerAddress || '',
      network: 'base',
      fallback: `🔒 TRUCHEQ SECURE CHECKOUT: The World ID Verified Seller has requested ${itemPrice || '1'} USDC. Complete safely: ${typeof window !== 'undefined' ? window.location.origin : ''}/pay/${listingCid.slice(0, 12)}`,
    };
    
    try {
      setIsSending(true);
      
      // Send as JSON string
      await conversation.sendText(JSON.stringify(invoicePayload));
      
      toast.success('Invoice sent to buyer!');
    } catch (error) {
      console.error('[XMTP] Invoice send error:', error);
      toast.error('Failed to send invoice');
    } finally {
      setIsSending(false);
    }
  }, [conversation, listingCid, itemPrice, itemName, itemImage, sellerAddress]);

  // ============================================================================
  // HANDLE PAY BUTTON CLICK (from Invoice Card)
  // ============================================================================
  
  const handlePayFromInvoice = useCallback((cid: string, metaUrl?: string) => {
    const payUrl = `/pay/${cid.slice(0, 12)}${metaUrl ? `?meta=${encodeURIComponent(metaUrl)}` : ''}`;
    router.push(payUrl);
  }, [router]);

  // ============================================================================
  // KEY HANDLERS
  // ============================================================================
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  async function copyAddress() {
    if (!sellerAddress) return;
    await navigator.clipboard.writeText(sellerAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  // Combined loading/error states
  const isLoading = isProviderLoading || isSellerLoading;
  const error = providerError || sellerError;
  const isReady = client !== null && conversation !== null;

  // ============================================================================
  // RENDER: Chat Open
  // ============================================================================
  
  if (isOpen) {
    return (
      <div className='fixed right-4 z-50 w-80 md:w-96' style={{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom, 0px))` }}>
        <Card className='border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden'>
          {/* Trust Header */}
          <TrustHeader 
            sellerName={sellerName || ''}
            sellerAddress={sellerAddress || ''}
            sellerPfp={sellerPfp}
            isOrbVerified={isOrbVerified}
            isConnected={isReady}
          />
          
          {/* Messages Area */}
          <CardContent className='p-0'>
            <div className='h-80 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-black/60 to-black/40'>
              {isLoading ? (
                <div className='text-center py-8'>
                  {isMiniApp
                    ? <Spinner className='w-8 h-8 mx-auto' />
                    : <Loader2 className='w-8 h-8 mx-auto animate-spin text-primary' />
                  }
                  <p className='text-xs text-muted-foreground mt-3'>Connecting...</p>
                </div>
              ) : error ? (
                <div className='text-center py-8'>
                  <AlertCircle className='w-10 h-10 mx-auto mb-3 text-red-500' />
                  <p className='text-sm font-medium text-white mb-1'>Connection Failed</p>
                  <p className='text-xs text-red-400 mb-3'>{error}</p>
                  <Button 
                    size='sm' 
                    variant='outline'
                    onClick={() => {
                      setConversation(null);
                      hasDmInitializedRef.current = false;
                      dmInitializedWithSellerRef.current = null;
                      setRetryKey(k => k + 1);
                      // Also retry provider if it had an error
                      if (providerError) initClient();
                    }}
                    className='border-white/20'
                  >
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className='text-center py-8'>
                  <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center'>
                    <MessageCircle className='w-8 h-8 text-primary/60' />
                  </div>
                  <p className='text-sm font-medium text-white mb-1'>Start a Conversation</p>
                  <p className='text-xs text-muted-foreground'>
                    Chat directly with the World ID verified seller
                  </p>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='flex items-end gap-2'
                      >
                        {/* System Messages - Centered */}
                        {msg.type === 'system' && (
                          <SystemMessage 
                            content={msg.content}
                            payload={msg.payload as SystemMessagePayload}
                          />
                        )}
                        
                        {/* x402 Invoice Cards */}
                        {msg.type === 'x402-invoice' && msg.payload && (
                          <div className='w-full'>
                            <InvoiceCard 
                              payload={msg.payload as X402InvoicePayload}
                              onPay={handlePayFromInvoice}
                              isBuyer={!msg.isSelf}
                              isMiniApp={isMiniApp}
                            />
                          </div>
                        )}
                        
                        {/* Regular Text Messages */}
                        {msg.type === 'text' && (
                          <div className={cn(
                            'flex w-full',
                            msg.isSelf ? 'justify-end' : 'justify-start',
                            'items-end gap-2'
                          )}>
                            {!msg.isSelf && (
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                                isOrbVerified 
                                  ? 'bg-gradient-to-br from-primary/80 to-primary/40' 
                                  : 'bg-blue-500/80'
                              )}>
                                <User className='w-3 h-3 text-white' />
                              </div>
                            )}
                            <div className='max-w-[75%]'>
                              <div 
                                className={cn(
                                  'px-4 py-3 rounded-2xl text-sm',
                                  msg.isSelf 
                                    ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-sm' 
                                    : 'bg-white/10 text-white rounded-bl-sm border border-white/5'
                                )}
                              >
                                <span className='whitespace-pre-wrap break-words'>{msg.content}</span>
                              </div>
                              {msg.isSelf && msg.status && (
                                <MessageStatus status={msg.status} isMiniApp={isMiniApp} />
                              )}
                            </div>
                            {msg.isSelf && (
                              <div className='w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                                <User className='w-3 h-3 text-white' />
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className='p-3 border-t border-white/10 bg-black/80'>
              <div className='flex gap-2 items-center'>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isReady ? 'Type a message...' : 'Connecting...'}
                  disabled={isSending || !isReady}
                  className='bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/50 h-9'
                />
                <Button 
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || isSending || !isReady}
                  size='sm'
                  className='bg-primary hover:bg-primary/90 h-9 px-3'
                >
                  {isSending ? (
                    isMiniApp
                      ? <Spinner className='w-4 h-4' />
                      : <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Send className='w-4 h-4' />
                  )}
                </Button>
              </div>
              
              {/* Seller Invoice Button */}
              {isReady && sellerAddress?.toLowerCase() === userAddress?.toLowerCase() && (
                <Button
                  onClick={sendInvoiceRequest}
                  disabled={isSending || !listingCid}
                  className='w-full mt-2 bg-gradient-to-r from-primary to-primary/80 text-black font-bold h-10 rounded-xl border-0'
                >
                  <DollarSign className='w-4 h-4 mr-2' />
                  Send x402 Invoice
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Close Button */}
        <Button
          onClick={() => setIsOpen(false)}
          variant='ghost'
          size='sm'
          className='absolute -top-3 -left-3 h-8 w-8 p-0 bg-black/80 border border-white/20 rounded-full hover:bg-white/10'
        >
          <X className='w-4 h-4' />
        </Button>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Chat Closed - Launcher Card
  // ============================================================================
  
  return (
    <>
      {/* Floating Launcher Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className='fixed right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 z-50'
        style={{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom, 0px))` }}
      >
        <MessageCircle className='w-6 h-6' />
        {isReady && (
          <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse' />
        )}
      </Button>

      {/* Collapsed Card (shown in page) */}
      <Card className='w-full max-w-md mx-auto border-white/10 bg-black/60 backdrop-blur-xl'>
        <CardHeader className='pb-3 border-b border-white/5'>
          <CardTitle className='text-lg flex items-center justify-between'>
            <span className='flex items-center gap-2'>
              <MessageCircle className='w-5 h-5 text-primary' />
              Chat with Seller
            </span>
            <Badge variant='secondary' className='bg-primary/20 text-primary text-xs'>
              XMTP
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className='p-4 space-y-4'>
          {/* Trust Indicators */}
          <div className='flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10'>
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isOrbVerified 
                ? 'bg-primary/20 text-primary' 
                : 'bg-blue-500/20 text-blue-400'
            )}>
              {isOrbVerified ? (
                <ShieldCheck className='w-5 h-5' />
              ) : (
                <Smartphone className='w-5 h-5' />
              )}
            </div>
            <div>
              <p className='text-sm font-bold text-white'>World ID Verified</p>
              <p className='text-xs text-muted-foreground'>
                {isOrbVerified ? 'Orb Verification' : 'Device Verification'}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setIsOpen(true)}
            className='w-full bg-primary hover:bg-primary/90'
          >
            <MessageCircle className='w-4 h-4 mr-2' />
            Open Chat
          </Button>

          <div className='p-4 rounded-xl bg-white/5 border border-white/10 space-y-3'>
            <p className='text-xs font-bold text-muted-foreground uppercase tracking-wider'>
              Seller Address
            </p>
            <p className='font-mono text-xs text-primary break-all'>
              {sellerAddress}
            </p>
            <div className='flex gap-2'>
              <Button 
                onClick={copyAddress}
                variant='outline' 
                size='sm' 
                className='flex-1 border-white/10 hover:bg-white/10'
              >
                <Copy className='w-4 h-4 mr-2' />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button 
                asChild
                variant='outline' 
                size='sm' 
                className='flex-1 border-white/10 hover:bg-white/10'
              >
                <a 
                  href={`https://xmtp.chat/dm/${sellerAddress}`}
                  target={isMiniApp ? undefined : '_blank'} 
                  rel='noopener noreferrer'
                  onClick={isMiniApp ? (e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(`https://xmtp.chat/dm/${sellerAddress}`);
                    toast.success('XMTP link copied!');
                  } : undefined}
                >
                  {isMiniApp
                    ? <><Copy className='w-4 h-4 mr-2' />Copy Link</>
                    : <><ExternalLink className='w-4 h-4 mr-2' />External</>
                  }
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
