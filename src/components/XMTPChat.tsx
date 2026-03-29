'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Client, Conversation, type DecodedMessage } from '@xmtp/xmtp-js';
import { getXMTPSigner, createXMTPClient, getXMTPEnv } from '@/lib/xmtp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

type Message = {
  id: string;
  sender: 'user' | 'seller';
  text: string;
  timestamp: Date;
};

interface XMTPChatProps {
  sellerAddress?: string;
}

export function XMTPChat({ sellerAddress }: XMTPChatProps) {
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize XMTP client when wallet connects
  useEffect(() => {
    let isCancelled = false;

    async function initXMTP() {
      if (!sellerAddress) return;
      
      setIsConnecting(true);
      setError(null);
      
      try {
        // Get signer from window.ethereum (World App, MetaMask, etc.)
        const xmtpSignerInfo = await getXMTPSigner();
        if (!xmtpSignerInfo) {
          setError('No wallet found. Please connect your wallet.');
          setIsConnecting(false);
          return;
        }
        
        const { address, signer } = xmtpSignerInfo;
        setMyAddress(address);
        
        // Create XMTP client with the signer
        console.log('[XMTP] Creating client...');
        const client = await createXMTPClient(signer, getXMTPEnv());
        console.log('[XMTP] Client created, address:', client.address);
        setXmtpClient(client);
        
        // Try to find or create conversation with seller
        try {
          console.log('[XMTP] Creating conversation with seller:', sellerAddress);
          
          // Create or get conversation with seller
          const conv = await client.conversations.newConversation(sellerAddress);
          console.log('[XMTP] Conversation created:', conv.topic);
          setConversation(conv);
          
          // Load existing messages
          const msgs = await conv.messages();
          console.log('[XMTP] Loaded messages:', msgs.length);
          
          if (!isCancelled) {
            const formattedMessages: Message[] = msgs.slice(-20).map((msg: DecodedMessage) => ({
              id: msg.id,
              sender: msg.senderAddress.toLowerCase() === client.address?.toLowerCase() 
                ? 'user' 
                : 'seller',
              text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              timestamp: msg.sent,
            }));
            setMessages(formattedMessages);
          }
        } catch (convError) {
          console.warn('[XMTP] Could not create conversation:', convError);
          if (!isCancelled) {
            setError('Could not start conversation with seller. They may not be on XMTP yet.');
          }
        }
      } catch (err: any) {
        console.error('[XMTP] Connection error:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to connect to XMTP');
        }
      }
      
      if (!isCancelled) {
        setIsConnecting(false);
      }
    }

    initXMTP();

    return () => {
      isCancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [sellerAddress]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversation || !xmtpClient) return;

    let isCancelled = false;
    abortControllerRef.current = new AbortController();

    async function streamMessages() {
      if (!conversation) return;
      
      try {
        const stream = await conversation.streamMessages();
        if (!stream) return;
        
        for await (const msg of stream) {
          if (isCancelled || abortControllerRef.current?.signal.aborted) break;
          
          if (xmtpClient && msg.senderAddress.toLowerCase() !== xmtpClient.address?.toLowerCase()) {
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
        console.warn('Could not stream messages:', err);
      }
    }

    streamMessages();

    return () => {
      isCancelled = true;
      abortControllerRef.current?.abort();
    };
  }, [conversation, xmtpClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || !conversation || !xmtpClient) return;
    
    setIsSending(true);
    try {
      // Send message
      await conversation.send(newMessage);
      
      // Add to local state
      const sentMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: newMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
    setIsSending(false);
  }

  if (!sellerAddress) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Chat with Seller</span>
          {xmtpClient && (
            <Badge variant="secondary" className="text-xs">
              XMTP Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {isConnecting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Connecting to XMTP...</span>
          </div>
        ) : !xmtpClient ? (
          <div className="text-center py-8 text-muted-foreground">
            Connect your wallet to chat with the seller
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div ref={scrollRef} className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p className={`text-xs mt-1 opacity-70 ${msg.sender === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSending && sendMessage()}
                disabled={isSending || !conversation}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isSending || !newMessage.trim() || !conversation}
                size="sm"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}