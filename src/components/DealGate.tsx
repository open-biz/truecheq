'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucideLock, LucideUnlock, LucideShieldCheck, LucideEye, LucideEyeOff } from 'lucide-react';

const CONTRACT_ADDRESS = '0x5216905cc7b7fF4738982837030921A22176c8C7';
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"address","name":"buyer","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"isFunded","type":"bool"},{"internalType":"bool","name":"isCompleted","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"pledge","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_dealId","type":"uint256"}],"name":"release","outputs":[],"stateMutability":"nonpayable","type":"function"},
] as const;

export function DealGate({ id }: { id: number }) {
  const { isConnected } = useAccount();
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
        toast.success("Transaction Confirmed!");
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
    <div className="max-w-2xl mx-auto py-12">
      <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden rounded-[2.5rem] border-t-primary/20">
        
        <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-3xl bg-black/40 border transition-colors duration-500 ${isFunded ? 'border-primary/50 text-primary' : 'border-white/10 text-muted-foreground'}`}>
                    {isFunded ? <LucideUnlock className="w-12 h-12" /> : <LucideLock className="w-12 h-12" />}
                </div>
            </div>
            <Badge variant="outline" className={`mx-auto mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isFunded ? 'bg-primary/20 text-primary border-primary/40' : 'bg-white/5 text-muted-foreground border-white/10'}`}>
                {isFunded ? "HTTP 200 OK" : "HTTP 402 PAYMENT REQUIRED"}
            </Badge>
            <CardTitle className="text-4xl font-black italic tracking-tighter">TruCheq x402 Gate</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">Deal Identifier: {id}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
            <div className="space-y-4">
                <div className={`p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden ${isFunded ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-black/40'}`}>
                    <div className={`transition-all duration-1000 ${!isFunded ? 'blur-2xl opacity-20' : 'blur-0 opacity-100'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <LucideEye className="text-primary w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Hidden Content</span>
                        </div>
                        <p className="font-bold text-lg leading-relaxed text-white">
                            {isFunded 
                                ? "REVEALED: https://meet.google.com/tru-cheq-demo-secret" 
                                : "This content is cryptographically locked until the settlement layer confirms the native CRO pledge."}
                        </p>
                    </div>
                    {!isFunded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                            <LucideEyeOff className="w-10 h-10 text-white/10 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Locked via Cronos EVM</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Contract Price</p>
                        <p className="text-2xl font-black text-primary">{(Number(price) / 1e18).toString()} CRO</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Settlement Status</p>
                        <p className={`text-sm font-black uppercase tracking-widest ${isFunded ? 'text-primary' : 'text-destructive'}`}>
                            {isFunded ? 'Funded' : 'Unfunded'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                {!isFunded ? (
                    <Button 
                        onClick={handlePledge}
                        disabled={isPending || isConfirming || !isConnected}
                        className="w-full py-10 text-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl shadow-[0_20px_40px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98]"
                    >
                        {isPending || isConfirming ? "Broadcasting..." : "Pledge CRO to Unlock"}
                    </Button>
                ) : !isCompleted ? (
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-4">
                            <LucideShieldCheck className="text-primary mt-1 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-primary uppercase tracking-widest mb-1">Protection Active</p>
                                <p className="text-xs font-bold text-foreground/70 leading-relaxed">
                                    Your funds are locked in the escrow. Only release them once you have verified the hidden content or received the service.
                                </p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleRelease}
                            disabled={isPending || isConfirming || !isConnected}
                            className="w-full py-10 text-2xl font-black bg-white text-black hover:bg-white/90 rounded-3xl transition-all active:scale-[0.98]"
                        >
                            {isPending || isConfirming ? "Finalizing..." : "Release Funds to Seller"}
                        </Button>
                    </div>
                ) : (
                    <div className="p-8 rounded-3xl bg-primary/20 border border-primary/40 text-center animate-in zoom-in-95">
                        <p className="font-black text-primary italic text-xl tracking-tighter">SETTLEMENT COMPLETE</p>
                        <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Transaction archived on Cronos Explorer</p>
                    </div>
                )}
                
                {!isConnected && (
                    <p className="text-center text-xs font-bold text-destructive animate-pulse mt-4">
                        Please connect your Crypto.com DeFi Wallet to interact.
                    </p>
                )}
            </div>
        </CardContent>
        
        <div className="px-10 pb-10 flex justify-between items-center opacity-30">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest font-mono">Cronos-T3-338</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">x402-v1.0</span>
        </div>
      </Card>
    </div>
  );
}