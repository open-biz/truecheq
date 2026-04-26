'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

import dynamic from 'next/dynamic';

interface XMTPChatProps {
  sellerAddress?: string;
  sellerName?: string;
  sellerPfp?: string;
  isOrbVerified?: boolean;
  listingCid?: string;
  itemName?: string;
  itemPrice?: string;
  itemImage?: string;
  /** Bottom offset for floating chat button (default: "1.5rem"). Use "5rem" when a sticky CTA bar is present. */
  bottomOffset?: string;
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

export function XMTPChat({ 
  sellerAddress,
  sellerName,
  sellerPfp,
  isOrbVerified,
  listingCid,
  itemName,
  itemPrice,
  itemImage,
  bottomOffset,
}: XMTPChatProps) {
  if (!sellerAddress) {
    return null;
  }

  return (
    <XMTPChatInner 
      sellerAddress={sellerAddress}
      sellerName={sellerName}
      sellerPfp={sellerPfp}
      isOrbVerified={isOrbVerified}
      listingCid={listingCid}
      itemName={itemName}
      itemPrice={itemPrice}
      itemImage={itemImage}
      bottomOffset={bottomOffset}
    />
  );
}