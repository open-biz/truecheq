'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Client, Conversation, type DecodedMessage } from '@xmtp/xmtp-js';
import { useWalletClient } from 'wagmi';
import { walletClientToSigner, getXMTPEnv } from '@/lib/xmtp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  MessageCircle as LucideMessageCircle,
  Send as LucideSend,
  Bot as LucideBot,
  User as LucideUser,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'seller';
  text: string;
  timestamp: Date;
}

interface XMTPChatProps {
  sellerAddress: string;
  listingId: number;
  listingTitle: string;
  price: string;
}

function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function XMTPChat({ sellerAddress, listingId, listingTitle, price }: XMTPChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const welcomeSentRef = useRef(false);
  
  // Get wallet client from wagmi
  const { data: walletClient } = useWalletClient();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Initialize XMTP client when wallet connects
  useEffect(() => {
    const initXMTP = async () => {
      if (!walletClient) {
        setXmtpClient(null);
        setIsConnected(false);
        return;
      }

      try {
        setIsConnecting(true);
        setError(null);
        
        // Convert viem walletClient to ethers signer
        const signer = await walletClientToSigner(walletClient);
        
        // Create XMTP client with the signer
        const client = await Client.create(signer, { env: getXMTPEnv() });
        setXmtpClient(client);
        
        // Try to find or create conversation with seller
        try {
          // Check if we already have a conversation with this seller
          const conversations = await client.conversations.list();
          const existingConv = conversations.find(
            (c) => c.peerAddress.toLowerCase() === sellerAddress.toLowerCase()
          );
          
          if (existingConv) {
            setConversation(existingConv);
          } else {
            // Create new conversation
            const newConv = await client.conversations.newConversation(sellerAddress);
            setConversation(newConv);
          }
          
          setIsConnected(true);
          
          // Send welcome message if this is a new conversation (using ref to avoid re-renders)
          if (!welcomeSentRef.current) {
            welcomeSentRef.current = true;
            const welcomeMessage: Message = {
              id: `msg-${Date.now()}-welcome`,
              sender: 'seller',
              text: `👋 Welcome! I'm the Seller Agent for **${listingTitle}**. Feel free to ask me anything about this listing or proceed to purchase at **${price} USDC** via x402 protocol.`,
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
          }
        } catch (convError) {
          console.warn('Could not load/create conversation:', convError);
          // Still connected to XMTP, just couldn't load conversation
          setIsConnected(true);
        }
        
      } catch (err) {
        console.error('XMTP initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to XMTP');
        setIsConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };

    initXMTP();
  }, [walletClient, sellerAddress]);

  // Load existing messages when conversation is available
  useEffect(() => {
    let isCancelled = false;
    
    const loadMessages = async () => {
      if (!xmtpClient || !conversation) return;
      
      try {
        const msgs = await conversation.messages();
        if (isCancelled) return;
        
        const formattedMessages: Message[] = msgs.slice(-20).map((msg: DecodedMessage) => ({
          id: msg.id,
          sender: msg.senderAddress.toLowerCase() === xmtpClient.address?.toLowerCase() 
            ? 'user' 
            : 'seller',
          text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: msg.sent,
        }));
        setMessages(formattedMessages);
      } catch (err) {
        console.warn('Could not load messages:', err);
      }
    };

    loadMessages();

    // Set up message stream for real-time updates
    let abortController: AbortController | null = null;
    
    const setupStream = async () => {
      if (!conversation || !xmtpClient) return;
      abortController = new AbortController();
      
      try {
        const stream = await conversation.streamMessages();
        
        for await (const msg of stream) {
          if (isCancelled || abortController?.signal.aborted) break;
          
          if (msg.senderAddress.toLowerCase() !== xmtpClient.address?.toLowerCase()) {
            const newMessage: Message = {
              id: msg.id,
              sender: 'seller',
              text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              timestamp: msg.sent,
            };
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      } catch (err) {
        console.warn('Message stream error:', err);
      }
    };

    setupStream();

    return () => {
      isCancelled = true;
      abortController?.abort();
    };
  }, [xmtpClient, conversation]);

  // Simulate agent response (for demo when no real seller bot is available)
  const simulateAgentResponse = useCallback(
    (userMessage: string) => {
      if (!isConnected || conversation) {
        // If we have a real conversation, we might not need simulation
        return;
      }
      
      setIsTyping(true);
      const delay = 1200 + Math.random() * 800;

      setTimeout(() => {
        const responses = [
          `Thanks for your interest in **${listingTitle}**! The price is **${price} USDC**. I can confirm this item is still available.`,
          `Great question! For **${listingTitle}**, I can offer secure payment via x402 protocol. Here's the payment link:\n\n🔗 \`/deal/${listingId}\`\n\nThe total is **${price} USDC** — payment is trustless and on-chain.`,
          `I'd be happy to help with that. The **${listingTitle}** is listed at **${price} USDC**. You can complete the purchase securely through our x402 payment gateway at \`/deal/${listingId}\`. All transactions are verified on-chain! ✅`,
        ];

        const responseIndex = messages.length % responses.length;

        const agentMessage: Message = {
          id: `msg-${Date.now()}-agent`,
          sender: 'seller',
          text: responses[responseIndex],
          timestamp: new Date(),
        };

        setIsTyping(false);
        setMessages((prev) => [...prev, agentMessage]);
      }, delay);
    },
    [listingId, listingTitle, price, messages.length, isConnected, conversation]
  );

  const handleConnect = async () => {
    // Connection is handled by the wallet client + XMTP initialization
    // This button is a fallback/refresh mechanism
    if (!walletClient) {
      setError('Please connect your wallet first');
      return;
    }
    
    setIsConnecting(true);
    // Trigger re-initialization via the useEffect
    setTimeout(() => setIsConnecting(false), 2000);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    inputRef.current?.focus();

    // If we have a real conversation, send via XMTP
    if (conversation && xmtpClient) {
      try {
        await conversation.send(text);
        // Message will appear via stream, no need to add manually
      } catch (err) {
        console.error('Failed to send message:', err);
        // Fall back to simulation on error
        simulateAgentResponse(text);
      }
    } else {
      // Fall back to simulation for demo
      simulateAgentResponse(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-primary"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part === '\n') {
        return <br key={i} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Show error state
  if (error) {
    return (
      <Card className="border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  Connection Error
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  XMTP could not be initialized
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={handleConnect} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
              <LucideMessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Chat with Seller
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {truncateAddress(sellerAddress)}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs gap-1.5',
              isConnected
                ? 'border-primary/40 text-primary bg-primary/10'
                : 'border-white/10 text-muted-foreground bg-white/5'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
              )}
            />
            {isConnected ? 'XMTP Connected' : isConnecting ? 'Connecting...' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[320px]">
          <div ref={scrollRef} className="flex flex-col gap-3 p-4 h-[320px] overflow-y-auto">
            {!isConnected ? (
              /* Connection Screen */
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                  <LucideMessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">
                    Start a conversation
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                    Connect to XMTP to chat directly with the seller about{' '}
                    <span className="text-white font-medium">{listingTitle}</span>
                  </p>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !walletClient}
                  className="mt-2 rounded-full px-6"
                  size="sm"
                >
                  {isConnecting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connecting…
                    </>
                  ) : !walletClient ? (
                    <>
                      <LucideUser className="h-4 w-4 mr-2" />
                      Connect Wallet First
                    </>
                  ) : (
                    <>
                      <LucideMessageCircle className="h-4 w-4" />
                      Connect to XMTP
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Messages */
              <>
                {messages.map((message) => {
                  const isUser = message.sender === 'user';
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2.5 max-w-[85%]',
                        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5',
                          isUser
                            ? 'bg-primary/20 border border-primary/30'
                            : 'bg-white/10 border border-white/10'
                        )}
                      >
                        {isUser ? (
                          <LucideUser className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <LucideBot className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div className="flex flex-col gap-1">
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-white/[0.07] border border-white/10 text-white/90 rounded-bl-md'
                          )}
                        >
                          {renderMessageText(message.text)}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] text-muted-foreground px-1',
                            isUser ? 'text-right' : 'text-left'
                          )}
                        >
                          {isUser ? 'You' : 'Seller'} · {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2.5 mr-auto max-w-[85%]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/10 mt-0.5">
                      <LucideBot className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/10 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        {isConnected && (
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-muted-foreground rounded-full px-4 h-10 text-sm focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
              >
                <LucideSend className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5 px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            {isConnected ? 'XMTP • End-to-end encrypted' : 'Powered by XMTP'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}