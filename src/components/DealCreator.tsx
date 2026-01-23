'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucidePackage, LucideLock, LucideLink } from 'lucide-react';

// TRUCHEQ_CONTRACT_ADDRESS - We'll use a placeholder or the actual one if deployed
const CONTRACT_ADDRESS = '0x5216905cc7b7fF4738982837030921A22176c8C7'; 
const ABI = [
  {"inputs":[{"internalType":"uint256","name":"_price","type":"uint256"}],"name":"createDeal","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
] as const;

export function DealCreator() {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [secret, setSecret] = useState('');
  const [dealId, setDealId] = useState<bigint | null>(null);

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleCreate = async () => {
    if (!itemName || !price || !secret) {
        toast.error("Please fill all fields");
        return;
    }

    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'createDeal',
            args: [parseEther(price)],
        });
    } catch (e) {
        toast.error("Transaction failed");
    }
  };

  return (
    <Card className="max-w-xl mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-black italic flex items-center gap-3">
            <LucidePackage className="text-primary" /> Create TruCheq
        </CardTitle>
        <CardDescription>Generate a secure x402 payment link for your item.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Item Name</label>
            <Input 
                placeholder="e.g. Rolex Submariner" 
                value={itemName} 
                onChange={(e) => setItemName(e.target.value)}
                className="bg-white/5 border-white/10"
            />
        </div>
        <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (CRO)</label>
            <Input 
                type="number" 
                placeholder="500" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                className="bg-white/5 border-white/10"
            />
        </div>
        <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hidden Content (Secret)</label>
            <textarea 
                placeholder="The link or info revealed after payment" 
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
        </div>

        <Button 
            onClick={handleCreate} 
            disabled={isPending || isConfirming}
            className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl"
        >
            {isPending || isConfirming ? "Broadcasting..." : "Deploy TruCheq"}
        </Button>

        {isConfirmed && (
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/30 animate-in zoom-in-95">
                <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <LucideLink className="w-4 h-4" /> Deal Created Successfully!
                </p>
                <div className="p-2 bg-black/40 rounded border border-white/5 font-mono text-[10px] break-all">
                    https://trucheq.xyz/deal/{hash?.slice(0, 10)}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
