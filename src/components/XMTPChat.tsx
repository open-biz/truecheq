'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

interface XMTPChatProps {
  sellerAddress?: string;
}

// Dynamically import the XMTP chat component to avoid SSR issues with WASM
const XMTPChatInner = dynamic(() => import('./XMTPChatInner').then(mod => ({ default: mod.XMTPChatInner })), {
  ssr: false,
  loading: () => <XMTPChatLoading />
});

// Loading placeholder while the chat component loads
function XMTPChatLoading() {
  return (
    <Card className="w-full max-w-md mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Chat with Seller
          </span>
          <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
            Loading...
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="animate-pulse flex items-center justify-center py-8">
          <MessageCircle className="w-8 h-8 text-primary/40" />
        </div>
      </CardContent>
    </Card>
  );
}

export function XMTPChat({ sellerAddress }: XMTPChatProps) {
  if (!sellerAddress) {
    return null;
  }

  // The XMTPChatInner component includes:
  // 1. A floating chat button (bottom-right corner)
  // 2. A card with embedded chat UI (when opened)
  // 3. XMTP address with Copy button and "Open in XMTP" external link
  return <XMTPChatInner sellerAddress={sellerAddress} />;
}