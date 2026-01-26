'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucidePackage, LucideExternalLink, LucideRefreshCw, LucideAlertCircle, LucideLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatUnits } from 'viem';

// Placeholder or Actual Registry Address
const REGISTRY_ADDRESS = '0xAC50c91ced2122EE2E2c7310b279387e0cA1cF91';
const REGISTRY_ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"string","name":"metadataCid","type":"string"},{"internalType":"uint256","name":"createdAt","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextDealId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
] as const;

interface Deal {
  id: number;
  seller: string;
  price: bigint;
  metadataCid: string;
  createdAt: bigint;
}

export function DealDashboard() {
  const { address, isConnected } = useAccount();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: nextDealId, refetch: refetchNextDealId } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'nextDealId',
    query: {
        enabled: (REGISTRY_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
    }
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }

    if (!nextDealId && (REGISTRY_ADDRESS as string) === '0x0000000000000000000000000000000000000000') {
        setIsLoading(false);
        return; 
    }

    const fetchDeals = async () => {
      setIsLoading(true);
      const userDeals: Deal[] = [];
      const totalDeals = Number(nextDealId || 0);

      // In a real app, use Multicall or The Graph. Here we loop (inefficient but simple for MVP).
      // Also, we can't filter by seller easily on-chain without an index.
      // We will loop and filter client-side for this demo.
      
      // Since we don't have the contract deployed, this loop won't run effectively.
      // We will mock it if address is 0x0...
      
      setDeals(userDeals.reverse());
      setIsLoading(false);
    };

    fetchDeals();
  }, [address, isConnected, nextDealId]);

  const handleRefresh = () => {
    refetchNextDealId();
  };

  if (!isConnected) {
    return (
      <Card className="max-w-4xl mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
        <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
          <LucideAlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-lg font-bold text-white">Connect Your Wallet</p>
          <p className="text-sm text-muted-foreground text-center">Connect your wallet to view your created deals.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">My Deals</h2>
          <p className="text-sm text-muted-foreground mt-1 font-bold">Track all your created TruCheq payment links</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="rounded-xl border-white/10 hover:bg-white/5"
          aria-label="Refresh deals"
        >
          <LucideRefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-white/10 bg-black/60 backdrop-blur-xl">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full bg-white/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <LucidePackage className="w-12 h-12 text-muted-foreground" />
            <p className="text-lg font-bold text-white">No Deals Yet</p>
            <p className="text-sm text-muted-foreground text-center">
                {(REGISTRY_ADDRESS as string) === '0x0000000000000000000000000000000000000000' 
                    ? "Contract not deployed. Please deploy TruCheqRegistry." 
                    : "Create your first TruCheq deal to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl border bg-white/5 border-white/10 text-muted-foreground">
                      <LucidePackage className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-white">Deal #{deal.id}</h3>
                        <Badge variant="outline" className="border-white/20 text-muted-foreground font-black uppercase text-[10px]">
                            PAYMENT LINK
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-muted-foreground">
                          Price: <span className="text-primary font-black">{formatUnits(deal.price, 6)} USDC</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/deal/${deal.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-white/10 hover:bg-white/5"
                      >
                        <LucideExternalLink className="w-4 h-4 mr-2" />
                        View Page
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
