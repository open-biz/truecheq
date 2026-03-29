'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucidePackage, LucideExternalLink, LucideRefreshCw, LucideAlertCircle, LucideXCircle, LucideShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { formatUnits } from 'viem';
import { toast } from 'sonner';

interface Listing {
  cid: string;
  seller: string;
  price: string;
  metadataUrl: string;
  isOrbVerified: boolean;
  createdAt: number;
}

export function DealDashboard() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For now, show empty state - future: load from localStorage or IPFS user's metadata
  React.useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }
    // TODO: Load user's listings from localStorage or IPFS
    setListings([]);
    setIsLoading(false);
  }, [address, isConnected]);

  const handleRefresh = () => {
    // TODO: Refresh from IPFS
  };

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
          <p className="text-sm text-muted-foreground mt-1 font-bold">Track all your TruCheq product listings</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5">
          <LucideRefreshCw className="w-4 h-4 mr-2" /> Refresh
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
        <div className="space-y-4">            {listings.map((listing, index) => (
            <Card key={index} className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl border bg-white/5 border-white/10 text-muted-foreground">
                      <LucidePackage className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-white">Listing</h3>
                        {listing.isOrbVerified && (
                          <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px] bg-primary/10">
                            <LucideShieldCheck className="w-3 h-3 mr-1" /> ORB
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-bold text-muted-foreground">
                        Price: <span className="text-primary font-black">{listing.price} USDC</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        CID: {listing.cid.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/deal/${listing.cid.slice(0, 12)}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
                      <Button variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5">
                        <LucideExternalLink className="w-4 h-4 mr-2" /> View
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
