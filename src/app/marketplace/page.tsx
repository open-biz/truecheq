'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LucideArrowLeft, 
  LucideSearch, 
  LucidePackage, 
  LucideShieldCheck, 
  LucideSmartphone,
  LucideExternalLink,
  LucideGrid3X3,
  LucideList,
  LucideRefreshCw,
  LucideFilter
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits } from 'viem';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RetroGrid, Spotlight, FloatingOrbs, ScrollReveal, Card3DTilt, GradientText } from '@/components/ui/code-graphics';
import type { DealMetadata } from '@/lib/filebase';

// Seed listings from IPFS (all from seller 0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2)
const SEED_LISTINGS: Listing[] = [
  {
    cid: 'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
    seller: '0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2',
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
    isOrbVerified: true,
  },
  {
    cid: 'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
    seller: '0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2',
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
    isOrbVerified: true,
  },
  {
    cid: 'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
    seller: '0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2',
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
    isOrbVerified: true,
  },
  {
    cid: 'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
    seller: '0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2',
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
    isOrbVerified: false,
  },
  {
    cid: 'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
    seller: '0x84BBEFF31B0619C7Dd7cC439359EeC486E733Ff2',
    price: '1',
    metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
    isOrbVerified: false,
  },
];

interface Listing {
  cid: string;
  seller: string;
  price: string;
  metadataUrl: string;
  isOrbVerified: boolean;
  metadata?: DealMetadata;
}

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  return (
    <ScrollReveal delay={index * 0.05} direction="up">
      <Card3DTilt className="perspective-1000">
        <Link href={`/deal/${listing.cid.slice(0, 12)}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
          <Card className="group border-white/10 bg-black/60 backdrop-blur-xl hover:border-primary/30 hover:bg-black/80 transition-all duration-300 overflow-hidden relative h-full">
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 rounded-[inherit] border border-primary/50 animate-pulse" />
            </div>
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Image */}
            {listing.metadata?.images && listing.metadata.images.length > 0 ? (
              <div className="aspect-[4/3] relative overflow-hidden">
                <img 
                  src={listing.metadata.images[0]} 
                  alt={listing.metadata.itemName}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            ) : (
              <div className="aspect-[4/3] relative bg-white/5 flex items-center justify-center">
                <LucidePackage className="w-16 h-16 text-white/10 group-hover:text-primary/50 transition-colors" />
              </div>
            )}
            
            <CardContent className="p-4 relative z-10">
              {/* Verification Badge */}
              <div className="flex items-center gap-2 mb-2">
                {listing.isOrbVerified ? (
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] font-black uppercase">
                    <LucideShieldCheck className="w-3 h-3 mr-1" /> Orb
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px] font-black uppercase">
                    <LucideSmartphone className="w-3 h-3 mr-1" /> Device
                  </Badge>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-black text-white mb-1 truncate group-hover:text-primary transition-colors">
                {listing.metadata?.itemName || 'Loading...'}
              </h3>
              
              {/* Description */}
              {listing.metadata?.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {listing.metadata.description}
                </p>
              )}
              
              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-primary">
                  {listing.price} <span className="text-sm font-bold text-primary/60">USDC</span>
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <LucideExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </Card3DTilt>
    </ScrollReveal>
  );
}

function ListingCardSkeleton() {
  return (
    <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
      <Skeleton className="aspect-[4/3] bg-white/5" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-20 bg-white/5" />
        <Skeleton className="h-6 w-full bg-white/5" />
        <Skeleton className="h-4 w-3/4 bg-white/5" />
        <Skeleton className="h-8 w-24 bg-white/5" />
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOrbOnly, setFilterOrbOnly] = useState(false);

  React.useEffect(() => {
    // Load seed listings for demo (in production, load from IPFS/localStorage)
    setListings(SEED_LISTINGS);
    setIsLoading(false);
  }, []);

  const refetchCount = () => {
    // Future: Refresh from IPFS
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = !searchQuery || 
      listing.metadata?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !filterOrbOnly || listing.isOrbVerified;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <Spotlight />
      <FloatingOrbs className="opacity-60" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />
      <RetroGrid className="opacity-30" />

      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src="/trucheq-logo-sz.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic">TruCheq</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="rounded-xl hover:bg-white/5 font-black text-xs uppercase tracking-widest">
                <LucideArrowLeft className="mr-2 w-4 h-4" /> Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary bg-primary/5 backdrop-blur-sm px-4 py-1.5 rounded-full font-bold">
              🛒 Marketplace
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 text-white uppercase">
              Discover <span className="text-primary italic">Verified</span> Listings
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-bold">
              Browse P2P listings from sybil-resistant sellers. Every listing is verified via World ID.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="relative py-8 px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 border-white/10 bg-white/5 rounded-xl h-12"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant={filterOrbOnly ? 'secondary' : 'outline'}
                onClick={() => setFilterOrbOnly(!filterOrbOnly)}
                className={cn(
                  "rounded-xl font-black text-xs uppercase",
                  filterOrbOnly ? "bg-primary text-primary-foreground" : "border-white/10 hover:bg-white/5"
                )}
              >
                <LucideFilter className="w-4 h-4 mr-2" />
                Orb Verified Only
              </Button>

              <div className="flex items-center border border-white/10 rounded-xl overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none h-10 w-10"
                >
                  <LucideGrid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="rounded-none h-10 w-10"
                >
                  <LucideList className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCount()}
                className="rounded-xl border-white/10 hover:bg-white/5"
              >
                <LucideRefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
              {Array(8).fill(0).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                <LucidePackage className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-black mb-2 text-white">No Listings Found</h3>
              <p className="text-muted-foreground font-bold">
                {searchQuery || filterOrbOnly 
                  ? "Try adjusting your filters or search query."
                  : "Be the first to create a listing!"}
              </p>
            </div>
          ) : (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 max-w-3xl mx-auto"
            )}>                <AnimatePresence>
                {filteredListings.map((listing, index) => (
                  viewMode === 'grid' ? (
                    <ListingCard key={listing.cid} listing={listing} index={index} />
                  ) : (
                    <motion.div
                      key={listing.cid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/deal/${listing.cid.slice(0, 20)}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
                        <Card className="group border-white/10 bg-black/60 backdrop-blur-xl hover:border-primary/30 transition-all p-4 flex items-center gap-4">
                          {/* Image */}
                          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5">
                            {listing.metadata?.images?.[0] ? (
                              <img src={listing.metadata.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <LucidePackage className="w-8 h-8 text-white/20" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">                {listing.isOrbVerified ? (
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] font-black uppercase">
                    <LucideShieldCheck className="w-3 h-3 mr-1" /> Orb
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px] font-black uppercase">
                    <LucideSmartphone className="w-3 h-3 mr-1" /> Device
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-black text-white truncate group-hover:text-primary transition-colors">
                {listing.metadata?.itemName || 'Listing'}
              </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {listing.metadata?.description}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <span className="text-2xl font-black text-primary">
                              {listing.price}
                            </span>
                            <p className="text-xs text-muted-foreground font-bold">USDC</p>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Stats */}
          {!isLoading && filteredListings.length > 0 && (
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">
                Showing {filteredListings.length} of {listings.length} listings
                {filterOrbOnly && ` (Orb Verified)`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl font-black mb-4 text-white uppercase">Ready to Sell?</h2>
          <p className="text-lg text-muted-foreground mb-8 font-bold">
            Create a verified listing and start trading securely.
          </p>
          <Link href="/app">
            <Button size="lg" className="px-10 py-6 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_0_20px_rgba(0,214,50,0.3)]">
              Create Listing <LucideExternalLink className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}