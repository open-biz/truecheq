'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  LucideArrowLeft,
  LucideShieldCheck,
  LucideSmartphone,
  LucideExternalLink,
  LucideMessageCircle,
} from 'lucide-react';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { useIsMiniApp } from '@/lib/use-mini-app';
import type { DealMetadata } from '@/lib/filebase';
import { XMTPChat } from '@/components/XMTPChat';
import { TruCheqAuth } from '@/components/TruCheqAuth';
import { type TruCheqUser, loadTruCheqUser, saveTruCheqUser, clearTruCheqUser, migrateToUnifiedUser } from '@/lib/trucheq-user';
import { useAccount, useDisconnect } from 'wagmi';
import { WorldWalletButton } from './WorldWalletButton';
import Link from 'next/link';

// ============================================================================
// Component: Image Gallery (horizontal swipe carousel)
// ============================================================================

function ImageGallery({ images, itemName }: { images: string[]; itemName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi | null>(null);

  if (!images || images.length === 0) return null;

  // Single image — no carousel needed
  if (images.length === 1) {
    return (
      <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        <img
          src={getProxiedImageUrl(images[0])}
          alt={itemName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Carousel
        opts={{ align: 'start', loop: true }}
        setApi={(carouselApi) => {
          if (!carouselApi) return;
          setApi(carouselApi);
          carouselApi.on('select', () => setActiveIndex(carouselApi.selectedScrollSnap()));
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {images.map((imageUrl, index) => (
            <CarouselItem key={index} className="pl-2">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <img
                  src={getProxiedImageUrl(imageUrl)}
                  alt={`${itemName} - Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Nav buttons — subtle overlay */}
        <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border-white/10 text-white hover:bg-black/80" />
        <CarouselNext className="right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border-white/10 text-white hover:bg-black/80" />
      </Carousel>

      {/* Dot indicators — clickable */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                index === activeIndex
                  ? 'bg-primary w-4 shadow-[0_0_6px_rgba(0,214,50,0.6)]'
                  : 'bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component: Sticky Bottom CTA (pay button)
// ============================================================================

function StickyBottomCTA({
  price,
  listingId,
  metadataUrl,
  isMiniApp,
}: {
  price: string;
  listingId: string;
  metadataUrl?: string;
  isMiniApp: boolean;
}) {
  const payUrl = `/pay/${listingId}${metadataUrl ? `?meta=${encodeURIComponent(metadataUrl)}` : ''}`;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 border-t border-white/5 bg-black/80 backdrop-blur-xl',
        isMiniApp ? 'bottom-0 pb-safe' : 'bottom-0',
      )}
    >
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
        {/* Price */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
          <p className="text-2xl font-black italic tracking-tighter text-primary">
            {price} <span className="text-[10px] font-bold text-primary/60 not-italic">USDC</span>
          </p>
        </div>

        {/* Pay button */}
        <Link href={payUrl} className="shrink-0">
          <Button className="h-12 px-6 text-sm font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_0_20px_rgba(0,214,50,0.3)] active:scale-[0.97] transition-all">
            <LucideExternalLink className="w-4 h-4 mr-2" />
            Pay via x402
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN: DealGate
// ============================================================================

export function DealGate({ id, metadataUrl }: { id: string; metadataUrl?: string }) {
  const [mounted, setMounted] = useState(false);
  const [metadata, setMetadata] = useState<DealMetadata | null>(null);
  const [trucheqUser, setTrucheqUser] = useState<TruCheqUser | null>(null);
  const isMiniApp = useIsMiniApp();

  const { address: walletAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const isOrbVerified = metadata?.isOrbVerified ?? false;
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

  // Load unified user from localStorage on mount
  useEffect(() => {
    const existing = loadTruCheqUser() || migrateToUnifiedUser();
    if (existing) {
      setTrucheqUser(existing);
    }
  }, []);

  // Save user to localStorage when changed
  useEffect(() => {
    if (trucheqUser) {
      saveTruCheqUser(trucheqUser);
    }
  }, [trucheqUser]);

  const handleAuthSuccess = useCallback((user: TruCheqUser) => {
    setTrucheqUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    setTrucheqUser(null);
    clearTruCheqUser();
    disconnect();
  }, [disconnect]);

  // Mini App: back navigation (standalone mode has header with back link)
  const miniAppBack = isMiniApp && (
    <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
      <LucideArrowLeft className="w-3 h-3" />
      Back to Marketplace
    </Link>
  );

  if (!mounted) return null;

  // ---- Not authenticated - show World ID sign-in ----
  if (!trucheqUser) {
    return (
      <div className="py-8 space-y-6">
        {miniAppBack}
        <div className="text-center">
          <h2 className="text-2xl font-black italic tracking-tighter text-white mb-2">
            Sign in to Purchase
          </h2>
          <p className="text-sm text-muted-foreground font-bold">
            Verify with World ID to buy this listing
          </p>
        </div>

        <TruCheqAuth
          onSuccess={handleAuthSuccess}
          skipWalletStep={isMiniApp}
        />

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Your World ID is used for identity verification — not linked to your wallet
        </p>
      </div>
    );
  }

  // ---- Authenticated but no wallet - show connect wallet ----
  if (trucheqUser && !isConnected) {
    return (
      <div className="py-8 space-y-6">
        {miniAppBack}
        <Card className="border-primary/20 bg-black/80 backdrop-blur-xl overflow-hidden rounded-2xl">
          <CardHeader className="text-center pb-2">
            <Badge variant="outline" className={cn(
              'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              trucheqUser.isOrbVerified
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
            )}>
              {trucheqUser.isOrbVerified ? <LucideShieldCheck className='w-3 h-3 mr-1.5' /> : <LucideSmartphone className='w-3 h-3 mr-1.5' />}
              {trucheqUser.isOrbVerified ? 'Orb' : 'Device'} Verified
            </Badge>
            <CardTitle className="text-xl font-black italic tracking-tighter">
              Connect Wallet to Pay
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
              Connect World App or any wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex justify-center">
              <WorldWalletButton size='md' />
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-muted-foreground text-xs"
            >
              Use different identity
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Fully authenticated with wallet - show listing ----
  return (
    <div className="space-y-5 pb-4">
      {miniAppBack}

      {/* Seller Identity Badge — compact inline */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn(
          'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
          isOrbVerified
            ? 'bg-primary/20 text-primary border-primary/40'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
        )}>
          {isOrbVerified ? <LucideShieldCheck className="w-3 h-3 mr-1" /> : <LucideSmartphone className="w-3 h-3 mr-1" />}
          {isOrbVerified ? 'Orb Verified Seller' : 'Device Verified Seller'}
        </Badge>
        <span className="text-[10px] font-mono text-muted-foreground">
          {sellerAddress ? `${sellerAddress.slice(0, 6)}...${sellerAddress.slice(-4)}` : ''}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[10px] text-muted-foreground h-7 px-2">
          Logout
        </Button>
      </div>

      {/* Image Gallery — horizontal swipe carousel */}
      {metadata && metadata.images && metadata.images.length > 0 && (
        <ImageGallery images={metadata.images} itemName={metadata.itemName} />
      )}

      {/* Item Title + Price */}
      <div>
        <h1 className="text-2xl font-black italic tracking-tighter text-white">
          {metadata?.itemName || 'Loading...'}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-3xl font-black italic tracking-tighter text-primary">
            {metadata?.price || '0'} <span className="text-[10px] font-bold text-primary/60 not-italic">USDC</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            on Base
          </span>
        </div>
      </div>

      {/* Description */}
      {metadata?.description && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-sm text-muted-foreground font-bold leading-relaxed">
            {metadata.description}
          </p>
        </div>
      )}

      {/* Buyer Identity Chip — subtle */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
        <div className={cn(
          'w-2 h-2 rounded-full',
          trucheqUser.isOrbVerified ? 'bg-primary' : 'bg-blue-400',
        )} />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {trucheqUser.isOrbVerified ? 'Orb' : 'Device'} Verified Buyer
        </span>
        <div className="h-3 w-px bg-white/10" />
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </span>
      </div>

      {/* Chat with Seller — compact expandable */}
      {metadata && isConnected && (
        <XMTPChat
          sellerAddress={sellerAddress}
          isOrbVerified={isOrbVerified}
          listingCid={id}
          itemName={metadata.itemName}
          itemPrice={metadata.price}
          itemImage={metadata.images?.[0]}
          bottomOffset="5rem"
        />
      )}

      {/* Trust Indicators */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
          <LucideShieldCheck className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            World ID Verified
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
          <LucideMessageCircle className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            XMTP Encrypted
          </p>
        </div>
      </div>

      {/* IPFS + Protocol Info — subtle footer */}
      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 pt-2">
        IPFS Listing #{id} · x402 Protocol on Base
      </p>

      {/* Sticky Bottom Pay CTA */}
      {metadata && (
        <StickyBottomCTA
          price={metadata.price}
          listingId={id}
          metadataUrl={metadataUrl}
          isMiniApp={isMiniApp}
        />
      )}
    </div>
  );
}
