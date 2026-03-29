'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucidePackage, LucideExternalLink, LucideRefreshCw, LucideAlertCircle, LucideXCircle, LucideShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { formatUnits } from 'viem';
import { toast } from 'sonner';

const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const REGISTRY_ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"listings","outputs":[{"internalType":"address","name":"sellerWallet","type":"address"},{"internalType":"string","name":"metadataURI","type":"string"},{"internalType":"uint256","name":"priceUSDC","type":"uint256"},{"internalType":"bool","name":"isOrbVerified","type":"bool"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextListingId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_listingId","type":"uint256"}],"name":"cancelListing","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

interface Listing {
  id: number;
  seller: string;
  price: bigint;
  metadataURI: string;
  isOrbVerified: boolean;
  isActive: boolean;
}

export function DealDashboard() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: nextListingId, refetch: refetchNextListingId } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'nextListingId',
    query: {
      enabled: REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000',
    }
  });

  const { writeContract, data: hash, isPending: isCancelling } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Listing Cancelled Successfully");
      refetchNextListingId();
    }
  }, [isConfirmed, refetchNextListingId]);

  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }

    if (REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false);
      return;
    }

    const fetchListings = async () => {
      setIsLoading(true);
      const userListings: Listing[] = [];
      const total = Number(nextListingId || 0);

      for (let i = 0; i < total; i++) {
        try {
          const response = await fetch(`/api/deal/${i}`);
          if (response.ok) {
            const data = await response.json();
            if (data.seller?.toLowerCase() === address.toLowerCase()) {
              userListings.push({
                id: i,
                seller: data.seller,
                price: BigInt(data.price || 0),
                metadataURI: data.metadataURI || '',
                isOrbVerified: data.isOrbVerified,
                isActive: data.isActive,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching listing ${i}:`, error);
        }
      }

      setListings(userListings.reverse());
      setIsLoading(false);
    };

    fetchListings();
  }, [address, isConnected, nextListingId, isConfirmed]);

  const handleRefresh = () => { refetchNextListingId(); };

  const handleCancel = (id: number) => {
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'cancelListing',
      args: [BigInt(id)],
    });
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
              {REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000'
                ? "Contract not deployed. Set NEXT_PUBLIC_REGISTRY_ADDRESS."
                : "Create your first listing to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl border bg-white/5 border-white/10 text-muted-foreground">
                      <LucidePackage className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-white">Listing #{listing.id}</h3>
                        {listing.isActive ? (
                          <Badge variant="outline" className="border-green-500/20 text-green-400 font-black uppercase text-[10px] bg-green-500/10">ACTIVE</Badge>
                        ) : (
                          <Badge variant="outline" className="border-destructive/20 text-destructive font-black uppercase text-[10px] bg-destructive/10">CANCELLED</Badge>
                        )}
                        {listing.isOrbVerified && (
                          <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px] bg-primary/10">
                            <LucideShieldCheck className="w-3 h-3 mr-1" /> ORB
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-bold text-muted-foreground">
                        Price: <span className="text-primary font-black">{formatUnits(listing.price, 6)} USDC</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/deal/${listing.id}`}>
                      <Button variant="outline" size="sm" className="rounded-xl border-white/10 hover:bg-white/5">
                        <LucideExternalLink className="w-4 h-4 mr-2" /> View
                      </Button>
                    </Link>
                    {listing.isActive && (
                      <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => handleCancel(listing.id)} disabled={isCancelling || isConfirming}>
                        <LucideXCircle className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                    )}
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
