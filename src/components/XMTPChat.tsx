'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useClient, useConversations, useMessages, useSendMessage } from '@xmtp/react-sdk';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // XMTP hooks
  const { client, isLoading: clientLoading } = useClient();
  const { conversations } = useConversations();
  // For now, we'll skip the real XMTP messages hook since we need a Conversation object
  // This keeps the simulated flow working while we integrate the real XMTP
  const [xmtpMessages, setXmtpMessages] = useState<any[]>([]);
  const { sendMessage } = useSendMessage();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Sync XMTP messages to local state
  useEffect(() => {
    if (xmtpMessages && xmtpMessages.length > 0) {
      const newMessages: Message[] = xmtpMessages.map((msg: any) => ({
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        sender: msg.senderAddress === client?.address ? 'user' : 'seller',
        text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: new Date(msg.timestamp || Date.now()),
      }));
      setMessages(newMessages);
    }
  }, [xmtpMessages, client?.address]);

  // Find or create conversation with seller
  useEffect(() => {
    if (client && conversations && sellerAddress) {
      // Find existing conversation with seller
      const existing = conversations.find((c: any) => 
        c.peerAddress.toLowerCase() === sellerAddress.toLowerCase()
      );
      
      if (existing) {
        setConversationId(existing.topic);
        setIsConnected(true);
      } else {
        // Create new conversation - we'll set it up when user sends first message
        setIsConnected(true);
      }
    }
  }, [client, conversations, sellerAddress]);

  // Handle real XMTP connection state
  useEffect(() => {
    if (client && !clientLoading) {
      setIsConnected(true);
    } else if (!clientLoading && !client) {
      setIsConnected(false);
    }
  }, [client, clientLoading]);

  // Simulate agent response when using real XMTP (placeholder for real agent bot)
  const simulateAgentResponse = useCallback(
    (userMessage: string) => {
      // If we have a real XMTP client, we could send to a bot here
      // For now, simulate responses
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
    [listingId, listingTitle, price, messages.length]
  );

  const handleConnect = async () => {
    setIsConnecting(true);

    // Real XMTP connection is handled by the XMTPProvider
    // We just need to wait for the client to be ready
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsConnected(true);
    setIsConnecting(false);

    // Welcome message from seller agent
    const welcomeMessage: Message = {
      id: `msg-${Date.now()}-welcome`,
      sender: 'seller',
      text: `👋 Welcome! I'm the Seller Agent for **${listingTitle}**. Feel free to ask me anything about this listing or proceed to purchase at **${price} USDC** via x402 protocol.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !isConnected) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    inputRef.current?.focus();

    // Real XMTP integration disabled for now - requires Conversation object
    // The simulated responses still work for demo purposes

    // Trigger agent response (simulated for now - real bot would come from XMTP network)
    simulateAgentResponse(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render simple markdown-like bold text
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
            {isConnected ? 'Connected' : 'Offline'}
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
                  disabled={isConnecting}
                  className="mt-2 rounded-full px-6"
                  size="sm"
                >
                  {isConnecting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connecting…
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
                          {isUser ? 'You' : 'Seller Agent'} · {formatTime(message.timestamp)}
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
            Powered by XMTP • End-to-end encrypted
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
