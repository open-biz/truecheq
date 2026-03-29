'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface XMTPChatProps {
  sellerAddress?: string;
}

export function XMTPChat({ sellerAddress }: XMTPChatProps) {
  const [copied, setCopied] = useState(false);

  if (!sellerAddress) {
    return null;
  }

  async function copyAddress() {
    if (!sellerAddress) return;
    await navigator.clipboard.writeText(sellerAddress);
    setCopied(true);
    toast.success('Seller address copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="w-full max-w-md mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Chat with Seller
          </span>
          <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
            XMTP Enabled
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <div className="text-center py-4">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-primary/60" />
          <p className="text-sm text-muted-foreground mb-4">
            The seller responds automatically via XMTP agent
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Seller's XMTP Address
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
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>
            <Button 
              asChild
              variant="outline" 
              size="sm" 
              className="flex-1 border-white/10 hover:bg-white/10"
            >
              <a 
                href={`https://xmtp.chat/dm/${sellerAddress || ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in XMTP
              </a>
            </Button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 <span className="font-bold">Tip:</span> Open in XMTP to chat with the seller's automated agent. 
            The agent responds instantly with listing info, prices, and purchase instructions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}