'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LucideSearch,
  LucidePackage,
  LucideShieldCheck,
  LucideSmartphone,
  LucideX,
  LucideRefreshCw,
  LucideMessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { SEED_LISTINGS, type Listing } from '@/lib/seed-listings';

// ============================================================================
// Component: Listing Card (mobile-optimized)
// ============================================================================

function MobileListingCard({ listing, index }: { listing: Listing; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <Link href={`/deal/${listing.cid}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
        <Card className='group border-white/10 bg-black/60 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 overflow-hidden'>
          <div className='flex items-stretch'>
            {/* Image */}
            <div className='w-28 shrink-0 relative overflow-hidden'>
              {listing.metadata?.images && listing.metadata.images.length > 0 ? (
                <img
                  src={getProxiedImageUrl(listing.metadata.images[0])}
                  alt={listing.metadata.itemName}
                  className='object-cover w-full h-full group-hover:scale-110 transition-transform duration-700'
                />
              ) : (
                <div className='w-full h-full bg-white/5 flex items-center justify-center min-h-[100px]'>
                  <LucidePackage className='w-8 h-8 text-white/10 group-hover:text-primary/50 transition-colors' />
                </div>
              )}
              {/* Hover shimmer */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
            </div>

            {/* Content */}
            <CardContent className='flex-1 p-3 min-w-0 flex flex-col justify-between'>
              <div>
                {/* Verification badge */}
                <div className='flex items-center gap-2 mb-1.5'>
                  {listing.isOrbVerified ? (
                    <Badge variant='outline' className='border-primary/30 text-primary bg-primary/10 text-[9px] font-black uppercase px-1.5 py-0'>
                      <LucideShieldCheck className='w-2.5 h-2.5 mr-0.5' /> Orb
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='border-blue-500/30 text-blue-400 bg-blue-500/10 text-[9px] font-black uppercase px-1.5 py-0'>
                      <LucideSmartphone className='w-2.5 h-2.5 mr-0.5' /> Device
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className='text-sm font-black text-white truncate group-hover:text-primary transition-colors'>
                  {listing.metadata?.itemName || 'Loading...'}
                </h3>

                {/* Description */}
                {listing.metadata?.description && (
                  <p className='text-[11px] text-muted-foreground mt-0.5 line-clamp-1'>
                    {listing.metadata.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className='mt-2'>
                <span className='text-lg font-black italic tracking-tighter text-primary'>
                  {listing.price} <span className='text-[10px] font-bold text-primary/60 not-italic'>USDC</span>
                </span>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

// ============================================================================
// Component: Listing Card Skeleton (mobile)
// ============================================================================

function MobileListingSkeleton() {
  return (
    <Card className='border-white/10 bg-black/60 backdrop-blur-xl'>
      <div className='flex items-stretch'>
        <Skeleton className='w-28 bg-white/5 rounded-none' />
        <CardContent className='flex-1 p-3 space-y-2'>
          <Skeleton className='h-3 w-16 bg-white/5' />
          <Skeleton className='h-4 w-full bg-white/5' />
          <Skeleton className='h-3 w-2/3 bg-white/5' />
          <Skeleton className='h-6 w-20 bg-white/5' />
        </CardContent>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN: MarketTab
// ============================================================================

export function MarketTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrbOnly, setFilterOrbOnly] = useState(false);

  // Fetch all listing metadata
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const listingsWithMetadata = await Promise.all(
        SEED_LISTINGS.map(async (listing) => {
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
      setListings(listingsWithMetadata);
    } catch (error) {
      console.error('Error fetching marketplace metadata:', error);
      setListings(SEED_LISTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesSearch =
        !q ||
        listing.metadata?.itemName?.toLowerCase().includes(q) ||
        listing.metadata?.description?.toLowerCase().includes(q);
      const matchesFilter = !filterOrbOnly || listing.isOrbVerified;
      return matchesSearch && matchesFilter;
    });
  }, [listings, searchQuery, filterOrbOnly]);

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-black tracking-tight text-white'>Browse All Listings</h2>
          <p className='text-sm text-muted-foreground font-bold'>
            {listings.length > 0
              ? `${filteredListings.length} listing${filteredListings.length !== 1 ? 's' : ''}${filterOrbOnly ? ' · Orb Only' : ''}`
              : 'Verified sellers, secure payments'}
          </p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={fetchListings}
          disabled={isLoading}
          className='h-8 w-8 p-0 rounded-full hover:bg-white/10'
        >
          <LucideRefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Search + Filter */}
      <div className='space-y-2'>
        <div className='relative'>
          <LucideSearch className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60' />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search listings...'
            className='bg-white/5 border-white/10 text-sm placeholder:text-muted-foreground/50 h-9 pl-9 pr-9'
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white/60 transition-colors'
            >
              <LucideX className='w-3.5 h-3.5' />
            </button>
          )}
        </div>

        {/* Quick filters */}
        <div className='flex items-center gap-2'>
          <Button
            variant={filterOrbOnly ? 'secondary' : 'outline'}
            size='sm'
            onClick={() => setFilterOrbOnly(!filterOrbOnly)}
            className={cn(
              'rounded-lg text-[10px] font-black uppercase tracking-widest h-7',
              filterOrbOnly
                ? 'bg-primary text-primary-foreground'
                : 'border-white/10 hover:bg-white/5',
            )}
          >
            <LucideShieldCheck className='w-3 h-3 mr-1' />
            Orb Only
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className='space-y-3'>
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <MobileListingSkeleton key={i} />
            ))}
        </div>
      )}

      {/* Listings */}
      {!isLoading && filteredListings.length > 0 && (
        <div className='space-y-3'>
          <AnimatePresence>
            {filteredListings.map((listing, index) => (
              <MobileListingCard key={listing.cid} listing={listing} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredListings.length === 0 && (
        <div className='py-12 text-center'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center'>
            {searchQuery || filterOrbOnly ? (
              <LucideSearch className='w-8 h-8 text-muted-foreground/40' />
            ) : (
              <LucidePackage className='w-8 h-8 text-muted-foreground' />
            )}
          </div>
          <p className='text-white font-bold mb-1'>
            {searchQuery || filterOrbOnly ? 'No results' : 'No listings yet'}
          </p>
          <p className='text-sm text-muted-foreground'>
            {searchQuery || filterOrbOnly
              ? `No listings match "${searchQuery || 'filter'}"`
              : 'Be the first to create one!'}
          </p>
        </div>
      )}

      {/* Trust indicators */}
      {!isLoading && listings.length > 0 && (
        <div className='grid grid-cols-2 gap-3 pt-2'>
          <div className='p-3 rounded-xl bg-white/5 border border-white/10 text-center'>
            <LucideShieldCheck className='w-5 h-5 text-primary mx-auto mb-1' />
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
              World ID Verified
            </p>
          </div>
          <div className='p-3 rounded-xl bg-white/5 border border-white/10 text-center'>
            <LucideMessageCircle className='w-5 h-5 text-primary mx-auto mb-1' />
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
              XMTP Encrypted
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
