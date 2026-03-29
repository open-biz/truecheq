'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Copy, Send, Loader2, X, AlertCircle, User, Bot, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Client, type Signer, IdentifierKind, ConsentState, type Dm } from '@xmtp/browser-sdk';
import { useWalletClient, useAccount } from 'wagmi';

interface XMTPChatInnerProps {
  sellerAddress?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderAddress: string;
  timestamp: Date;
  isSelf: boolean;
}

// Type alias for Dm conversation

export function XMTPChatInner({ sellerAddress }: XMTPChatInnerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Dm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const isStreamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Wait for client-side hydration before checking wallet
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get wallet client and account from wagmi
  const { data: walletClient } = useWalletClient();
  const { address: userAddress, isConnected, chainId } = useAccount();
  
  // Check if wallet is on Base (either mainnet 8453 or Sepolia 84532)
  const isCorrectChain = chainId === 8453 || chainId === 84532;

  // Debug logging
  useEffect(() => {
    console.log('[XMTP V7] Wallet state:', 
      'isConnected:', isConnected,
      'userAddress:', userAddress,
      'chainId:', chainId,
      'hasWalletClient:', !!walletClient
    );
  }, [isConnected, userAddress, chainId, walletClient]);

  // Create custom XMTP signer for browser-sdk v7
  const getXmtpSigner = useCallback((): Signer | null => {
    if (!walletClient || !userAddress) return null;
    
    try {
      const signer: Signer = {
        type: 'EOA',
        getIdentifier: async () => ({
          identifier: userAddress.toLowerCase() as `0x${string}`,
          identifierKind: IdentifierKind.Ethereum,
        }),
        signMessage: async (message: string): Promise<Uint8Array> => {
          const signature = await walletClient.signMessage({ message });
          const hex = signature.slice(2);
          const bytes = new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
          return bytes;
        },
      };
      
      return signer;
    } catch (error) {
      console.error('[XMTP] Failed to create XMTP signer:', error);
      return null;
    }
  }, [walletClient, userAddress]);

  // Track initialization
  const hasInitializedRef = useRef(false);
  const initializedWithRef = useRef<string | null>(null);
  const initializedWithSellerRef = useRef<string | null>(null);
  
  // Check if seller address is valid (not a placeholder)
  const isSellerAddressValid = sellerAddress && sellerAddress.startsWith('0x') && !sellerAddress.includes('abcdef');

  // Initialize XMTP client when wallet connects
  useEffect(() => {
    async function initXMTP() {
      // Skip if already initialized for this wallet AND seller combination
      if (hasInitializedRef.current && 
          initializedWithRef.current === userAddress && 
          initializedWithSellerRef.current === sellerAddress) {
        console.log('[XMTP V7] Already initialized for this wallet+seller, skipping');
        return;
      }
      
      // Reset if wallet or seller changed
      if (initializedWithRef.current !== userAddress || initializedWithSellerRef.current !== sellerAddress) {
        console.log('[XMTP V7] Wallet or seller changed, resetting initialization state');
        hasInitializedRef.current = false;
      }

      // Check prerequisites
      if (!isHydrated || !isConnected || !userAddress) {
        console.log('[XMTP V7] Skipping init - wallet not ready', {
          isHydrated,
          isConnected,
          userAddress,
          sellerAddress
        });
        return;
      }
      
      // Check if seller address is valid
      if (!isSellerAddressValid) {
        console.log('[XMTP V7] Skipping init - seller address not loaded yet (placeholder:', sellerAddress, ')');
        return;
      }

      // Check if we have wallet client, if not try to get it
      if (!walletClient) {
        console.log('[XMTP V7] No walletClient from hook, will try to get it differently');
      } else {
        console.log('[XMTP V7] Wallet client available:', walletClient.account.address);
      }

      console.log('[XMTP V7] All checks passed, proceeding with init...');
      
      try {
        setIsLoading(true);
        setError(null);
        console.log('[XMTP V7] Initializing with wallet:', userAddress);
        
        // Create XMTP signer - use walletClient if available, otherwise try to create from userAddress
        let xmtpSigner: Signer | null = null;
        
        if (walletClient) {
          xmtpSigner = getXmtpSigner();
        } else {
          // Try to create a simple EOA signer from the address
          console.log('[XMTP V7] Creating signer from address directly (no walletClient)');
          xmtpSigner = {
            type: 'EOA',
            getIdentifier: async () => ({
              identifier: userAddress.toLowerCase() as `0x${string}`,
              identifierKind: IdentifierKind.Ethereum,
            }),
            signMessage: async (_message: string): Promise<Uint8Array> => {
              // Without walletClient, we can't sign - this is a limitation
              throw new Error('Wallet client not available for signing. Please reconnect your wallet.');
            },
          };
        }
        
        if (!xmtpSigner) {
          throw new Error('Failed to create XMTP signer from wallet');
        }
        
        // Create XMTP client with v7 API - use dev network to match agent
        console.log('[XMTP V7] Creating client on dev network...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xmtpClient = await Client.create(xmtpSigner, { env: 'dev' } as any);
        
        if (!isMountedRef.current) {
          xmtpClient.close();
          return;
        }
        
        console.log('[XMTP V7] ✅ Client created, inboxId:', xmtpClient.inboxId);
        setClient(xmtpClient);
        
        // Check if seller can be messaged (v7 API)
        if (!sellerAddress) {
          setError('No seller address provided');
          setIsLoading(false);
          return;
        }
        
        console.log('[XMTP V7] Checking if seller is reachable:', sellerAddress);
        console.log('[XMTP V7] Calling Client.canMessage...');
        console.log('[XMTP V7] Seller address lower:', sellerAddress.toLowerCase());
        
        console.log('[XMTP V7] About to call Client.canMessage with:', sellerAddress.toLowerCase());
        
        let isReachable = false;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const canMessageResult = await Client.canMessage([{
            identifier: sellerAddress.toLowerCase() as `0x${string}`,
            identifierKind: IdentifierKind.Ethereum,
          }], { env: 'dev' } as any);
          console.log('[XMTP V7] canMessage completed, result:', canMessageResult);
          console.log('[XMTP V7] canMessageResult type:', typeof canMessageResult, Object.prototype.toString.call(canMessageResult));
          
          // Try different ways to get the result
          try {
            isReachable = canMessageResult.get(sellerAddress.toLowerCase()) ?? false;
          } catch (e) {
            console.log('[XMTP V7] canMessageResult.get() error:', e);
            // Try with the original address
            try {
              isReachable = canMessageResult.get(sellerAddress) ?? false;
            } catch (e2) {
              console.log('[XMTP V7] canMessageResult.get() with original also failed:', e2);
            }
          }
        } catch (canMsgError) {
          console.error('[XMTP V7] canMessage failed:', canMsgError);
          setError('Failed to check if seller can receive messages: ' + (canMsgError instanceof Error ? canMsgError.message : 'Unknown error'));
          setIsLoading(false);
          return;
        }
        console.log('[XMTP V7] Seller reachable result:', isReachable);
        
        if (!isReachable) {
          console.log('[XMTP V7] 💡 Seller has not registered on XMTP yet.');
          console.log('[XMTP V7] 💡 They need to use an XMTP app (like xmtp.chat) first to receive messages.');
          setError('Seller has not registered on XMTP yet. They need to use an XMTP app first.');
          setIsLoading(false);
          return;
        }
        
        // Sync conversations (v7 uses syncAll for DMs)
        console.log('[XMTP V7] ✅ Seller is reachable, proceeding to sync...');
        console.log('[XMTP V7] Syncing conversations...');
        await xmtpClient.conversations.syncAll([ConsentState.Allowed]);
        
        // Find or create DM using v7 API 
        console.log('[XMTP V7] Finding or creating DM...');
        console.log('[XMTP V7] Current user inboxId:', xmtpClient.inboxId);
        console.log('[XMTP V7] Seller address for DM:', sellerAddress.toLowerCase());
        
        let dm: Dm | undefined;
        
        try {
          // First try to find existing DM
          console.log('[XMTP V7] Listing existing DMs...');
          const existingDms = await xmtpClient.conversations.listDms();
          console.log('[XMTP V7] Found', existingDms.length, 'existing DMs');
          
          // Find DM with matching peer by checking canMessage result
          for (const d of existingDms) {
            // Try to find by checking if we can message this peer
            try {
              // peerInboxId is a function in v7
              const peerIdFn = (d as { peerInboxId?: () => Promise<string> }).peerInboxId;
              if (peerIdFn) {
                const peerId = await peerIdFn();
                if (peerId.toLowerCase() === sellerAddress.toLowerCase()) {
                  dm = d;
                  break;
                }
              }
            } catch {
              continue;
            }
          }
          
          // If no existing DM found, create new one
          if (!dm) {
            console.log('[XMTP V7] Creating new DM with address:', sellerAddress.toLowerCase());
            try {
              dm = await xmtpClient.conversations.createDm(
                sellerAddress.toLowerCase() as `0x${string}`
              );
              console.log('[XMTP V7] ✅ Created new DM with topic:', dm?.topic);
            } catch (createError) {
              console.error('[XMTP V7] ❌ Failed to create DM:', createError);
              throw createError;
            }
          } else {
            console.log('[XMTP V7] Found existing DM');
          }
        } catch (dmError) {
          console.error('[XMTP V7] DM error:', dmError);
          throw dmError;
        }
        
        if (!dm || !isMountedRef.current) {
          setIsLoading(false);
          return;
        }
        
        console.log('[XMTP V7] ✅ DM ready, topic:', dm.topic);
        setConversation(dm);
        
        // Load messages using v7 API
        try {
          const msgs = await dm.messages();
          console.log('[XMTP V7] Loaded', msgs.length, 'messages');
          
          if (!isMountedRef.current) return;
          
          // Use type assertion for message properties
          const formattedMessages = msgs.map((msg) => {
            const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
            return {
              id: msgAny.id || Date.now().toString(),
              content: typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content),
              senderAddress: msgAny.senderInboxId || '',
              timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
              isSelf: (msgAny.senderInboxId || '').toLowerCase() === (userAddress || '').toLowerCase()
            };
          });
          setMessages(formattedMessages);
        } catch (msgError) {
          console.error('[XMTP V7] Error loading messages:', msgError);
        }
        
        toast.success('Connected to XMTP!');
        console.log('[XMTP V7] 🎉 XMTP initialization complete! Ready to send/receive messages.');
        
        // Set up message streaming for real-time incoming messages
        // Only set up if not already streaming to prevent duplicates
        if (!isStreamingRef.current) {
          console.log('[XMTP V7] Setting up message stream...');
          
          // Create abort controller for cancellation
          abortControllerRef.current = new AbortController();
          
          try {
            // Use the conversation's stream method
            const messageStream = await dm.stream();
            isStreamingRef.current = true;
            
            // Create an async iterator handler
            const handleStream = async () => {
              try {
                for await (const msg of messageStream) {
                  // Check if streaming was cancelled
                  if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) break;
                  
                  const msgAny = msg as { id?: string; content?: unknown; senderInboxId?: string; sentAt?: Date };
                  const senderId = msgAny.senderInboxId || '';
                  const msgId = msgAny.id || `${Date.now()}-${Math.random()}`;
                  
                  // Only add messages from the other party (not from ourselves)
                  if (senderId.toLowerCase() !== (userAddress || '').toLowerCase()) {
                    console.log('[XMTP V7] Received new message:', msgAny.content);
                    setMessages(prev => {
                      // Avoid duplicates by checking ID or content+timestamp
                      const exists = prev.some(m => 
                        m.id === msgId || 
                        (m.content === msgAny.content && 
                         Math.abs(m.timestamp.getTime() - (msgAny.sentAt?.getTime() || Date.now())) < 2000)
                      );
                      if (exists) return prev;
                      return [...prev, {
                        id: msgId,
                        content: typeof msgAny.content === 'string' ? msgAny.content : JSON.stringify(msgAny.content),
                        senderAddress: senderId,
                        timestamp: msgAny.sentAt ? new Date(msgAny.sentAt) : new Date(),
                        isSelf: false
                      }];
                    });
                  }
                }
              } catch (streamError) {
                if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
                  console.log('[XMTP V7] Message stream ended or error:', streamError);
                }
              } finally {
                isStreamingRef.current = false;
              }
            };
            
            // Start the stream handler
            handleStream();
            
            // Store cleanup function
            streamCleanupRef.current = () => {
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              isStreamingRef.current = false;
              console.log('[XMTP V7] Message stream cleanup');
            };
            
            console.log('[XMTP V7] Message stream set up successfully');
          } catch (streamError) {
            console.error('[XMTP V7] Error setting up message stream:', streamError);
            isStreamingRef.current = false;
          }
        }
        
        // Mark as initialized
        hasInitializedRef.current = true;
        initializedWithRef.current = userAddress;
        initializedWithSellerRef.current = sellerAddress;
      } catch (error) {
        console.error('[XMTP V7] Init error:', error);
        if (isMountedRef.current) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to connect to XMTP';
          setError(errorMsg);
          toast.error('Failed to connect: ' + errorMsg.substring(0, 100));
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    }
    
    initXMTP();
    
    return () => {
      isMountedRef.current = false;
      // Cleanup message stream
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
  }, [walletClient, userAddress, sellerAddress, isConnected, retryKey, isHydrated, getXmtpSigner]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    if (!conversation) {
      toast.error('XMTP not connected. Please wait or refresh.');
      return;
    }
    
    try {
      setIsSending(true);
      await conversation.sendText(inputValue);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: inputValue,
        senderAddress: userAddress || '',
        timestamp: new Date(),
        isSelf: true
      }]);
      setInputValue('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('[XMTP V7] Send error:', error);
      toast.error('Failed to send: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  }, [inputValue, conversation, isSending, userAddress]);

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function copyAddress() {
    if (!sellerAddress) return;
    await navigator.clipboard.writeText(sellerAddress);
    setCopied(true);
    toast.success('Seller address copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  // Ready state - check if we have both client and conversation
  const isReady = client !== null && conversation !== null;

  // Chat window open
  if (isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96">
        <Card className="border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-white/10 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  {isReady && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="font-bold">Chat with Seller</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center border border-black">
                  <User className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center border border-black">
                  <Bot className="w-3 h-3 text-black" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                You • AI Agent
              </p>
              {error && (
                <Badge variant="destructive" className="text-[8px] py-0 px-1">
                  <AlertCircle className="w-2 h-2 mr-1" />
                  Error
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="h-72 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black/60 to-black/40">
              {!isConnected ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                  <p className="text-sm font-medium text-white mb-1">Wallet Not Connected</p>
                  <p className="text-xs text-muted-foreground">Connect your wallet to start chatting</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground mt-3">Connecting to XMTP...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                  <p className="text-sm font-medium text-white mb-1">Connection Failed</p>
                  <p className="text-xs text-red-400 mb-3">{error}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setClient(null);
                      setConversation(null);
                      hasInitializedRef.current = false;
                      initializedWithRef.current = null;
                      setRetryKey(k => k + 1);
                    }}
                    className="border-white/20"
                  >
                    Retry Connection
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 mx-auto mb-3 text-primary" />
                  <p className="text-sm font-medium text-white mb-1">AI Seller Agent</p>
                  <p className="text-xs text-muted-foreground mb-3">Ask me about watches, prices, or anything!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'} items-end gap-2`}
                  >
                    {!msg.isSelf && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-black" />
                      </div>
                    )}
                    <div 
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        msg.isSelf 
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-sm' 
                          : 'bg-white/10 text-white rounded-bl-sm border border-white/5'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.isSelf && (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t border-white/10 bg-black/80">
              <div className="flex gap-2 items-center">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isReady ? "Type a message..." : "Connecting..."}
                  disabled={isSending || !isReady}
                  className="bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/50 h-9"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isSending || !isReady}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9 px-3"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chat closed - show launcher button
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

      <Card className="w-full max-w-md mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Chat with Seller
            </span>
            <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
              XMTP
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <div className="text-center py-4">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-primary/60" />
            <p className="text-sm text-muted-foreground mb-4">
              Chat directly with the seller's AI agent
            </p>
            <Button 
              onClick={() => setIsOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Open Chat
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Seller XMTP Address
            </p>
            <p className="font-mono text-xs text-primary break-all">
              {sellerAddress}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={copyAddress}
                variant="outline" 
                size="sm" 
                className="flex-1 border-white/10 hover:bg-white/10"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="sm" 
                className="flex-1 border-white/10 hover:bg-white/10"
              >
                <a 
                  href={`https://xmtp.chat/dm/${sellerAddress}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in XMTP
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}