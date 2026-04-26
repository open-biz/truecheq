'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucidePackage, LucideExternalLink, LucideRefreshCw, LucideAlertCircle, LucideShieldCheck, LucideSmartphone } from 'lucide-react';
import Link from 'next/link';
import { cn, getProxiedImageUrl, STORAGE_KEYS } from '@/lib/utils';
import { SEED_LISTINGS, type Listing } from '@/lib/seed-listings';
import type { DealMetadata } from '@/lib/filebase';

export function DealDashboard() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<(Listing & { metadata?: DealMetadata })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadListings = async () => {
    if (!isConnected || !address) {
      setListings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userAddress = address.toLowerCase();

      // 1. Load user-created listings from localStorage
      const storedListings: (Listing & { metadata?: DealMetadata })[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.USER_LISTINGS);
        if (raw) {
          const parsed = JSON.parse(raw) as Listing[];
          // Only include listings owned by this wallet
          parsed
            .filter((l) => l.seller?.toLowerCase() === userAddress)
            .forEach((l) => storedListings.push(l));
        }
      } catch (e) {
        console.error('Failed to load user listings:', e);
      }

      // 2. Include demo listings where the demo seller matches this wallet
      const demoListings = SEED_LISTINGS.filter(
        (l) => l.seller?.toLowerCase() === userAddress,
      );

      // 3. Merge — deduplicate by CID (user-created take priority)
      const seen = new Set(storedListings.map((l) => l.cid));
      for (const demo of demoListings) {
        if (!seen.has(demo.cid)) {
          storedListings.push(demo);
        }
      }

      // 4. Fetch metadata for all listings
      const withMetadata = await Promise.all(
        storedListings.map(async (listing) => {
          if (listing.metadata) return listing;
          try {
            const response = await fetch(listing.metadataUrl);
            if (response.ok) {
              const metadata = await response.json();
              return { ...listing, metadata };
            }
          } catch (err) {
            console.error(`Failed to fetch metadata for ${listing.cid}:`, err);
          }
          return listing;
        }),
      );

      setListings(withMetadata);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    // Re-load when window regains focus (user may have created a listing in another tab)
    const onFocus = () => loadListings();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <Card className="max-w-4xl mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
        <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
          <LucideAlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-lg font-bold text-white">Connect Your Wallet</p>
          <p className="text-sm text-muted-foreground text-center">Connect your wallet to view your listings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">My Listings</h2>
          <p className="text-sm text-muted-foreground mt-1 font-bold">
            {listings.length > 0
              ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} for your wallet`
              : 'Track all your TruCheq product listings'}
          </p>
        </div>
        <Button
          onClick={loadListings}
          variant="outline"
          size="sm"
          className="rounded-xl border-white/10 hover:bg-white/5"
          disabled={isLoading}
        >
          <LucideRefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/10 bg-black/60 backdrop-blur-xl">
              <CardContent className="p-6"><Skeleton className="h-20 w-full bg-white/5" /></CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <LucidePackage className="w-12 h-12 text-muted-foreground" />
            <p className="text-lg font-bold text-white">No Listings Yet</p>
            <p className="text-sm text-muted-foreground text-center">
              Create your first listing to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card
              key={listing.cid}
              className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/20 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    {listing.metadata?.images && listing.metadata.images.length > 0 ? (
                      <img
                        src={getProxiedImageUrl(listing.metadata.images[0])}
                        alt={listing.metadata.itemName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <LucidePackage className="w-6 h-6 text-white/10" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-black text-white truncate">
                        {listing.metadata?.itemName || 'Loading...'}
                      </h3>
                      {listing.isOrbVerified ? (
                        <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[9px] bg-primary/10 shrink-0">
                          <LucideShieldCheck className="w-2.5 h-2.5 mr-0.5" /> ORB
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-500/20 text-blue-400 font-black uppercase text-[9px] bg-blue-500/10 shrink-0">
                          <LucideSmartphone className="w-2.5 h-2.5 mr-0.5" /> Device
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">
                      Price: <span className="text-primary font-black">{listing.price} USDC</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      CID: {listing.cid.slice(0, 12)}...
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    <Link href={`/deal/${listing.cid.slice(0, 12)}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
                      <Button variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5">
                        <LucideExternalLink className="w-4 h-4 mr-1.5" /> View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
