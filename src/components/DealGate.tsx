'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideLock, LucideShieldCheck, LucideSmartphone, LucideImage, LucideXCircle, LucideExternalLink, LucideBot } from 'lucide-react';
import { cn, getProxiedImageUrl, STORAGE_KEYS } from '@/lib/utils';
import type { DealMetadata } from '@/lib/filebase';
import { XMTPChat } from '@/components/XMTPChat';
import { WorldIDBuyerAuth, type WorldIDBuyer } from '@/components/WorldIDBuyerAuth';
import { useAccount } from 'wagmi';
import { WorldWalletButton } from './WorldWalletButton';
import Link from 'next/link';

export function DealGate({ id, metadataUrl }: { id: string; metadataUrl?: string }) {
  const [mounted, setMounted] = useState(false);
  const [metadata, setMetadata] = useState<DealMetadata | null>(null);
  const [worldBuyer, setWorldBuyer] = useState<WorldIDBuyer | null>(null);
  
  const { address: walletAddress, isConnected } = useAccount();

  const isOrbVerified = metadata?.isOrbVerified ?? false;
  // Use seller's actual address from metadata for XMTP chat
  const sellerAddress = metadata?.seller || '';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!metadataUrl) return;
      try {
        const response = await fetch(metadataUrl);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    fetchMetadata();
  }, [metadataUrl, id]);

  // Load buyer from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BUYER);
    if (stored) {
      try {
        const buyerData = JSON.parse(stored);
        setWorldBuyer(buyerData);
      } catch (e) {
        console.error('Failed to load buyer from storage', e);
      }
    }
  }, []);

  // Save buyer to localStorage when changed
  useEffect(() => {
    if (worldBuyer) {
      localStorage.setItem(STORAGE_KEYS.BUYER, JSON.stringify(worldBuyer));
    }
  }, [worldBuyer]);

  const handleBuyerSuccess = useCallback((buyer: WorldIDBuyer, address?: string) => {
    setWorldBuyer(buyer);
  }, []);

  const handleLogout = useCallback(() => {
    setWorldBuyer(null);
    localStorage.removeItem(STORAGE_KEYS.BUYER);
  }, []);

  if (!mounted) return null;

  // ---- Not authenticated - show World ID sign-in ----
  if (!worldBuyer) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            Sign in to Purchase
          </h2>
          <p className="text-sm text-muted-foreground font-bold">
            Verify with World ID to buy this listing
          </p>
        </div>
        
        <WorldIDBuyerAuth onSuccess={handleBuyerSuccess} />
        
        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Your World ID is used for identity verification - not linked to your wallet
        </p>
      </div>
    );
  }

  // ---- Authenticated but no wallet - show connect wallet ----
  if (worldBuyer && !isConnected) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <Card className="border-primary/20 bg-black/80 backdrop-blur-xl overflow-hidden rounded-[2rem]">
          <CardHeader className="text-center pb-2">
            <Badge variant='outline' className={cn(
              'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              worldBuyer.isOrbVerified
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
            )}>
              {worldBuyer.isOrbVerified ? <LucideShieldCheck className='w-3 h-3 mr-1.5' /> : <LucideSmartphone className='w-3 h-3 mr-1.5' />}
              {worldBuyer.isOrbVerified ? 'Orb' : 'Device'} Verified
            </Badge>
            <CardTitle className="text-2xl font-black italic tracking-tighter">
              Connect Wallet to Pay
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
              World ID verified • Connect World App or any wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex justify-center">
              <WorldWalletButton size='md' />
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-muted-foreground text-xs"
            >
              Use different World ID
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Fully authenticated with wallet - show listing ----
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      {/* Buyer Status Bar */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
        <Badge variant='outline' className={cn(
          'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
          worldBuyer.isOrbVerified
            ? 'bg-primary/20 text-primary border-primary/40'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
        )}>
          {worldBuyer.isOrbVerified ? <LucideShieldCheck className='w-3 h-3 mr-1' /> : <LucideSmartphone className='w-3 h-3 mr-1' />}
          {worldBuyer.isOrbVerified ? 'Orb' : 'Device'} Verified Buyer
        </Badge>
        <div className="h-4 w-px bg-white/20" />
        <span className="text-xs font-mono text-muted-foreground">
          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </span>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[10px]">
          Logout
        </Button>
      </div>

      {/* Listing Details Card */}
      <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden rounded-[2.5rem] border-t-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-3xl bg-black/40 border border-white/10 text-muted-foreground">
              <LucideLock className="w-12 h-12" />
            </div>
          </div>

          {/* Seller Verification Badge */}
          <div className="flex justify-center gap-2 mb-4">
            <Badge variant="outline" className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              isOrbVerified
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
            )}>
              {isOrbVerified ? <LucideShieldCheck className="w-3 h-3 mr-1.5" /> : <LucideSmartphone className="w-3 h-3 mr-1.5" />}
              {isOrbVerified ? 'Orb Verified Seller' : 'Device Verified Seller'}
            </Badge>
          </div>

          <CardTitle className="text-4xl font-black italic tracking-tighter">{metadata?.itemName || 'Loading...'}</CardTitle>
          <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">
            IPFS • Listing #{id}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          {metadata && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LucideImage className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Item Details</span>
              </div>

              {metadata.images && metadata.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {metadata.images.map((imageUrl, index) => (
                    <div key={index} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                      <img src={getProxiedImageUrl(imageUrl)} alt={`${metadata.itemName} - Image ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-2xl font-black text-white mb-2">{metadata.itemName}</h3>
                <p className="text-sm text-muted-foreground font-bold">{metadata.description}</p>
              </div>
            </div>
          )}

          {/* Payment Section — x402 */}
          <div className="space-y-4 pt-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Due</p>
              <p className="text-3xl font-black text-primary">{metadata?.price || '0'} USDC</p>
            </div>

            <Link href={`/pay/${id}${metadataUrl ? `?meta=${encodeURIComponent(metadataUrl)}` : ''}`}>
              <Button
                className="w-full py-10 text-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl shadow-[0_20px_40px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98]"
              >
                <LucideExternalLink className="w-6 h-6 mr-3" />
                Pay via x402
              </Button>
            </Link>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LucideBot className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Agent API Endpoint</span>
              </div>
              <code className="block text-xs text-primary font-mono break-all bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/deal/{id}/x402
              </code>
              <p className="text-[10px] text-muted-foreground">
                Agents can purchase this listing programmatically via the x402 protocol.
              </p>
            </div>

            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Powered by Coinbase x402 Protocol on Base
            </p>
          </div>
        </CardContent>
      </Card>

      {/* XMTP Chat - show when wallet connected */}
      {metadata && isConnected && (
        <XMTPChat
          sellerAddress={sellerAddress}
        />
      )}
      
    </div>
  );
}
