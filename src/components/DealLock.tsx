'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucideLock, LucideUnlock, LucidePackage, LucideShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const CONTRACT_ADDRESS = '0x5216905cc7b7fF4738982837030921A22176c8C7';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"isFunded","type":"bool"},{"internalType":"bool","name":"isCompleted","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"pledge","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"release","outputs":[],"stateMutability":"nonpayable","type":"function"},
] as const;

export function DealLock({ id }: { id: number }) {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  const { data: deal, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'deals',
    args: [BigInt(id)],
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    setMounted(true);
    if (isSuccess) {
        refetch();
        if (deal && deal[3]) { // isFunded
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#00D632", "#FFFFFF"] });
        }
    }
  }, [isSuccess]);

  if (!mounted || !deal) return null;

  const [seller, buyer, price, isFunded, isCompleted] = deal;

  const handlePledge = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'pledge',
      args: [BigInt(id)],
      value: price,
    });
  };

  const handleRelease = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'release',
      args: [BigInt(id)],
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card className="border-white/10 bg-black/70 backdrop-blur-3xl shadow-2xl relative overflow-hidden p-8 rounded-[3rem]">
        
        <div className="flex justify-between items-start mb-10">
            <div>
                <Badge variant="outline" className={`mb-4 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] ${isFunded ? 'bg-primary/20 text-primary border-primary' : 'bg-destructive/20 text-destructive border-destructive'}`}>
                    {isCompleted ? "COMPLETED" : isFunded ? "FUNDS LOCKED" : "PAYMENT REQUIRED"}
                </Badge>
                <CardTitle className="text-4xl font-black tracking-tight mb-2">Deal #{id}</CardTitle>
                <CardDescription className="text-sm font-bold truncate max-w-xs">Seller: {seller}</CardDescription>
            </div>
            <div className="p-5 rounded-3xl bg-black/40 border border-white/10 text-primary">
                <LucidePackage className="w-10 h-10" />
            </div>
        </div>

        <div className="space-y-6 mb-12">
            <div className="p-10 rounded-3xl border border-white/5 bg-black/40 flex flex-col items-center justify-center relative group">
                <div className={`transition-all duration-700 ${!isFunded ? 'blur-xl grayscale' : 'blur-0 grayscale-0'}`}>
                    <p className="text-center font-black text-xl italic text-primary">SECRET CONTENT UNLOCKED</p>
                    <p className="text-sm text-center mt-2 text-muted-foreground">The deal details are now visible to you.</p>
                </div>
                {!isFunded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <LucideLock className="w-12 h-12 text-white/20 mb-4" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40">402 Payment Required</p>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center py-4 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price</span>
                <span className="text-3xl font-black text-primary tracking-tighter">{(Number(price) / 1e18).toString()} CRO</span>
            </div>
        </div>

        <div className="space-y-4">
            {!isFunded ? (
                <Button 
                    onClick={handlePledge}
                    disabled={isPending || isConfirming}
                    className="w-full py-10 text-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl shadow-[0_20px_40px_rgba(0,214,50,0.3)]"
                >
                    {isPending || isConfirming ? "Broadcasting..." : "Pledge CRO"}
                </Button>
            ) : !isCompleted ? (
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-4 mb-4">
                        <LucideShieldCheck className="text-primary mt-1 shrink-0" />
                        <p className="text-sm font-bold text-foreground/80 leading-relaxed">
                            Funds are secured in the TruCheq escrow. Only you can release them to the seller once you've received your item.
                        </p>
                    </div>
                    <Button 
                        onClick={handleRelease}
                        disabled={isPending || isConfirming}
                        className="w-full py-10 text-2xl font-black bg-white text-black hover:bg-white/90 rounded-3xl"
                    >
                        {isPending || isConfirming ? "Releasing..." : "Clear Funds to Seller"}
                    </Button>
                </div>
            ) : (
                <div className="p-6 rounded-3xl bg-primary/10 border border-primary/30 text-center">
                    <p className="font-black text-primary italic">DEAL FINISHED</p>
                    <p className="text-xs text-muted-foreground mt-1">Funds have been transferred to the seller.</p>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
}