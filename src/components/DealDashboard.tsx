'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LucidePackage, LucideCheckCircle, LucideClock, LucideExternalLink, LucideRefreshCw, LucideAlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CONTRACT_ADDRESS = '0x5216905cc7b7fF4738982837030921A22176c8C7';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"isFunded","type":"bool"},{"internalType":"bool","name":"isCompleted","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextDealId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
] as const;

interface Deal {
  id: number;
  seller: string;
  buyer: string;
  price: bigint;
  isFunded: boolean;
  isCompleted: boolean;
}

export function DealDashboard() {
  const { address, isConnected } = useAccount();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: nextDealId, refetch: refetchNextDealId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'nextDealId',
  });

  useEffect(() => {
    if (!isConnected || !address || !nextDealId) {
      setIsLoading(false);
      return;
    }

    const fetchDeals = async () => {
      setIsLoading(true);
      const userDeals: Deal[] = [];
      const totalDeals = Number(nextDealId);

      for (let i = 0; i < totalDeals; i++) {
        try {
          const response = await fetch(`/api/deal/${i}`);
          if (response.ok) {
            const dealData = await response.json();
            
            if (dealData.seller?.toLowerCase() === address.toLowerCase()) {
              userDeals.push({
                id: i,
                seller: dealData.seller,
                buyer: dealData.buyer,
                price: BigInt(dealData.price || 0),
                isFunded: dealData.isFunded || false,
                isCompleted: dealData.isCompleted || false,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching deal ${i}:`, error);
        }
      }

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

  const getStatusBadge = (deal: Deal) => {
    if (deal.isCompleted) {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/40 font-black uppercase text-[10px]">
          <LucideCheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (deal.isFunded) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 font-black uppercase text-[10px]">
          <LucideClock className="w-3 h-3 mr-1" />
          Funded
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-white/20 text-muted-foreground font-black uppercase text-[10px]">
        <LucideClock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const totalRevenue = deals
    .filter(d => d.isCompleted)
    .reduce((sum, d) => sum + Number(d.price), 0);

  const activeDeals = deals.filter(d => d.isFunded && !d.isCompleted).length;
  const completedDeals = deals.filter(d => d.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">My Deals</h2>
          <p className="text-sm text-muted-foreground mt-1 font-bold">Track all your created TruCheq deals</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Total Deals</CardDescription>
            <CardTitle className="text-3xl font-black text-white">{deals.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Active Deals</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-400">{activeDeals}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-black/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Total Revenue</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">{(totalRevenue / 1e18).toFixed(2)} CRO</CardTitle>
          </CardHeader>
        </Card>
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
            <p className="text-sm text-muted-foreground text-center">Create your first TruCheq deal to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn(
                      "p-3 rounded-2xl border",
                      deal.isCompleted ? "bg-primary/10 border-primary/20 text-primary" : 
                      deal.isFunded ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                      "bg-white/5 border-white/10 text-muted-foreground"
                    )}>
                      <LucidePackage className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-white">Deal #{deal.id}</h3>
                        {getStatusBadge(deal)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-muted-foreground">
                          Price: <span className="text-primary font-black">{(Number(deal.price) / 1e18).toFixed(2)} CRO</span>
                        </p>
                        {deal.buyer !== '0x0000000000000000000000000000000000000000' && (
                          <p className="text-xs font-mono text-muted-foreground">
                            Buyer: {deal.buyer.slice(0, 6)}...{deal.buyer.slice(-4)}
                          </p>
                        )}
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
                        View Deal
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
