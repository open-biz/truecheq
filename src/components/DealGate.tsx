'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract, useAccount, useSignTypedData, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucideLock, LucideUnlock, LucideShieldCheck, LucideRefreshCw, LucideImage, LucideCheckCircle, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealMetadata } from '@/lib/filebase';
import { parseUnits } from 'viem';

const REGISTRIES: Record<number, string> = {
    338: '0xAC50c91ced2122EE2E2c7310b279387e0cA1cF91',
    84532: '0x0000000000000000000000000000000000000000'
};

const USDCS: Record<number, string> = {
    338: '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0', // devUSDC.e (Cronos)
    84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // USDC (Base Sepolia)
};

const REGISTRY_ABI = [
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"deals","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"string","name":"metadataCid","type":"string"},{"internalType":"uint256","name":"createdAt","type":"uint256"}],"stateMutability":"view","type":"function"},
] as const;

const ERC20_ABI = [
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
] as const;

export function DealGate({ id, metadataUrl }: { id: number; metadataUrl?: string }) {
  const { address, isConnected, chainId: currentChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [metadata, setMetadata] = useState<DealMetadata | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const dealChainId = metadata?.chainId || 338; // Default to Cronos
  const registryAddress = REGISTRIES[dealChainId];

  // Read deal from registry
  const { data: deal } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'deals',
    args: [BigInt(id)],
    query: {
        enabled: !!metadata && id > 0 && (registryAddress as string) !== '0x0000000000000000000000000000000000000000',
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (id === 0 && !metadataUrl) {
        setMetadata({
            itemName: 'Rolex Submariner Date',
            description: 'Ref. 126610LN - 2023 - Full Set - Unworn. This is a demo transaction.',
            price: '500',
            images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop'],
            seller: '0x0000000000000000000000000000000000000000',
            createdAt: Date.now(),
            chainId: 338,
        });
        return;
    }

    const fetchMetadata = async () => {
      if (!metadataUrl) return;
      try {
        const response = await fetch(metadataUrl);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };

    fetchMetadata();
  }, [metadataUrl, id]);

  const handleCronosPayment = async () => {
    if (!metadata || !address) return;
    
    setIsProcessing(true);
    try {
        const domain = {
            name: 'USD Coin', 
            version: '1',     
            chainId: 338,     
            verifyingContract: USDCS[338] as `0x${string}`,
        };

        const types = {
            TransferWithAuthorization: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'bytes32' },
            ],
        };

        const value = parseUnits(metadata.price, 6);
        const validAfter = BigInt(0);
        const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
        const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');

        const message = {
            from: address,
            to: metadata.seller as `0x${string}`,
            value: value,
            validAfter: validAfter,
            validBefore: validBefore,
            nonce: nonce as `0x${string}`,
        };

        toast.info("Please sign the payment authorization in your wallet...");

        const signature = await signTypedDataAsync({
            domain,
            types,
            primaryType: 'TransferWithAuthorization',
            message,
        });

        toast.info("Processing settlement via X402 Facilitator...");

        const response = await fetch('/api/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signature,
                message: {
                    ...message,
                    value: message.value.toString(),
                    validAfter: message.validAfter.toString(),
                    validBefore: message.validBefore.toString(),
                },
                domain
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Settlement failed');
        }

        setIsPaid(true);
        toast.success("Payment Successful! Funds settled to seller.");

    } catch (error: any) {
        console.error("Payment error:", error);
        toast.error("Payment Failed", {
            description: error.message || "Could not complete the transaction."
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleBasePayment = async () => {
      if (!metadata || !address) return;
      setIsProcessing(true);
      try {
          const value = parseUnits(metadata.price, 6);
          const hash = await writeContractAsync({
              address: USDCS[84532] as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'transfer',
              args: [metadata.seller as `0x${string}`, value],
          });
          
          toast.success("Transaction Submitted!", { description: "Waiting for confirmation..." });
          
          // Ideally check receipt here
          setIsPaid(true); // Optimistic UI for now
      } catch (error: any) {
          console.error("Base Payment error:", error);
          toast.error("Transaction Failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const onPayClick = () => {
      if (currentChainId !== dealChainId) {
          toast.info(`Switching to ${dealChainId === 338 ? 'Cronos' : 'Base'}...`);
          switchChain({ chainId: dealChainId });
          return;
      }

      if (dealChainId === 338) {
          handleCronosPayment();
      } else if (dealChainId === 84532) {
          handleBasePayment();
      }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden rounded-[2.5rem] border-t-primary/20">
        
        <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
                <div 
                    className={cn(
                        "p-4 rounded-3xl bg-black/40 border transition-colors duration-500",
                        isPaid ? 'border-primary/50 text-primary' : 'border-white/10 text-muted-foreground'
                    )}
                >
                    {isPaid ? <LucideCheckCircle className="w-12 h-12" /> : <LucideLock className="w-12 h-12" />}
                </div>
            </div>
            <Badge variant="outline" className={cn(
                "mx-auto mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                isPaid ? 'bg-primary/20 text-primary border-primary/40' : 'bg-white/5 text-muted-foreground border-white/10'
            )}>
                {isPaid ? "PAYMENT COMPLETE" : "X402 PAYMENT REQUIRED"}
            </Badge>
            <CardTitle className="text-4xl font-black italic tracking-tighter">TruCheq Checkout</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">
                {dealChainId === 338 ? 'Cronos Testnet' : 'Base Sepolia'} • Deal #{id}
            </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
            {metadata && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <LucideImage className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Item Details</span>
                    </div>
                    
                    {metadata.images && metadata.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {metadata.images.map((imageUrl, index) => (
                                <div key={index} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                                    <img 
                                        src={imageUrl} 
                                        alt={`${metadata.itemName} - Image ${index + 1}`} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-2xl font-black text-white mb-2">{metadata.itemName}</h3>
                        <p className="text-sm text-muted-foreground font-bold">{metadata.description}</p>
                    </div>
                </div>
            )}

            <div className="space-y-4 pt-4">
                {!isPaid ? (
                    <div className="space-y-4">
                         <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Due</p>
                            <p className="text-3xl font-black text-primary">{metadata?.price || '0'} USDC</p>
                        </div>

                        {currentChainId !== dealChainId ? (
                            <Button 
                                onClick={onPayClick}
                                className="w-full py-10 text-xl font-black bg-blue-600 hover:bg-blue-700 text-white rounded-3xl"
                            >
                                <ArrowLeftRight className="mr-2 w-5 h-5" />
                                Switch to {dealChainId === 338 ? 'Cronos' : 'Base'}
                            </Button>
                        ) : (
                            <Button 
                                onClick={onPayClick}
                                disabled={isProcessing || !isConnected}
                                className="w-full py-10 text-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl shadow-[0_20px_40px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                <span className="flex items-center gap-3">
                                    <LucideRefreshCw className="w-5 h-5 animate-spin" />
                                    Processing...
                                </span>
                                ) : dealChainId === 338 ? "Pay with Cronos (Gasless)" : "Pay with Base"}
                            </Button>
                        )}

                        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                            Powered by {dealChainId === 338 ? 'Cronos x402 Facilitator' : 'Base Smart Payments'}
                        </p>
                    </div>
                ) : (
                    <div className="p-8 rounded-3xl bg-primary/20 border border-primary/40 text-center animate-in zoom-in-95">
                        <p className="font-black text-primary italic text-xl tracking-tighter">TRANSACTION SETTLED</p>
                        <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                            Funds transferred to seller.
                        </p>
                    </div>
                )}
                
                {!isConnected && (
                    <p className="text-center text-xs font-bold text-destructive animate-pulse mt-4">
                        Please connect your wallet to interact.
                    </p>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
