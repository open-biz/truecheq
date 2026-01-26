'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucideLock, LucideUnlock, LucideEye, LucideEyeOff, LucideAlertCircle, LucideRefreshCw, LucideImage, LucideCheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealMetadata } from '@/lib/filebase';
import { Facilitator, CronosNetwork, Contract } from '@crypto.com/facilitator-client';
import { parseUSDCAmount, CRONOS_TESTNET_USDCE } from '@/lib/x402';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SELLER_WALLET = process.env.NEXT_PUBLIC_SELLER_WALLET || '';

export function DealGateX402({ id, metadataUrl }: { id: number; metadataUrl?: string }) {
  const { address, isConnected } = useAccount();
  const [metadata, setMetadata] = useState<DealMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [secretContent, setSecretContent] = useState<string | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!metadataUrl) return;
      
      setIsLoadingMetadata(true);
      try {
        const response = await fetch(metadataUrl);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
        toast.error('Failed to load deal metadata');
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [metadataUrl]);

  const handleX402Payment = async () => {
    if (!metadata || !metadataUrl || !address) {
      toast.error('Missing required information');
      return;
    }

    setIsPaying(true);

    try {
      const client = new Facilitator({
        network: CronosNetwork.CronosTestnet,
      });

      const priceInUSDC = Math.floor(parseFloat(metadata.price) * 1000000);

      toast.info('Requesting payment authorization...');

      if (!window.ethereum) {
        toast.error('No wallet detected');
        setIsPaying(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const paymentHeader = await client.generatePaymentHeader({
        to: SELLER_WALLET,
        value: priceInUSDC.toString(),
        asset: Contract.USDCe,
        signer,
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 300,
      });

      toast.info('Verifying payment with Facilitator...');

      const apiUrl = `/api/deal/${id}/x402?meta=${encodeURIComponent(metadataUrl)}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-PAYMENT': paymentHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 402) {
        const data = await response.json();
        toast.error('Payment Required', {
          description: data.error || 'Please complete payment to unlock content',
        });
        setIsPaying(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      const result = await response.json();

      if (result.success) {
        setSecretContent(result.secret);
        setPaymentTxHash(result.payment.txHash);
        setIsPaid(true);
        toast.success('Payment Successful!', {
          description: `Transaction: ${result.payment.txHash.slice(0, 10)}...`,
        });
      }
    } catch (error: any) {
      console.error('x402 payment error:', error);
      toast.error('Payment Failed', {
        description: error.message || 'Failed to process payment',
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <LucideRefreshCw className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg font-bold text-muted-foreground">Loading deal...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl relative overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
            <LucideAlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-lg font-bold text-white">Deal Not Found</p>
            <p className="text-sm text-muted-foreground text-center">This deal doesn't exist or metadata is unavailable.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                    role="status"
                    aria-live="polite"
                    aria-label={isPaid ? "Deal paid and unlocked" : "Deal locked, payment required"}
                >
                    {isPaid ? <LucideUnlock className="w-12 h-12" /> : <LucideLock className="w-12 h-12" />}
                </div>
            </div>
            <Badge variant="outline" className={cn(
                "mx-auto mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                isPaid ? 'bg-primary/20 text-primary border-primary/40' : 'bg-white/5 text-muted-foreground border-white/10'
            )}>
                {isPaid ? "HTTP 200 OK" : "HTTP 402 PAYMENT REQUIRED"}
            </Badge>
            <CardTitle className="text-4xl font-black italic tracking-tighter">TruCheq x402 Gate</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">Deal Identifier: #{id}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
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

            <div className="space-y-4">
                <div className={`p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden ${isPaid ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-black/40'}`}>
                    <div className={`transition-all duration-1000 ${!isPaid ? 'blur-2xl opacity-20' : 'blur-0 opacity-100'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <LucideEye className="text-primary w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Hidden Content</span>
                        </div>
                        <p className="font-bold text-lg leading-relaxed text-white break-all">
                            {isPaid && secretContent
                                ? secretContent
                                : "This content is cryptographically locked until x402 payment is verified and settled."}
                        </p>
                    </div>
                    {!isPaid && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                            <LucideEyeOff className="w-10 h-10 text-white/10 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Locked via x402 Protocol</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Price (USDC.e)</p>
                        <p className="text-2xl font-black text-primary">{metadata.price} USDC</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Payment Status</p>
                        <p className={`text-sm font-black uppercase tracking-widest ${isPaid ? 'text-primary' : 'text-destructive'}`}>
                            {isPaid ? 'Settled' : 'Pending'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                {!isPaid ? (
                    <Button 
                        onClick={handleX402Payment}
                        disabled={isPaying || !isConnected}
                        className="w-full py-10 text-2xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl shadow-[0_20px_40px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Pay with USDC.e to unlock content"
                    >
                        {isPaying ? (
                          <span className="flex items-center gap-3">
                            <LucideRefreshCw className="w-5 h-5 animate-spin" />
                            Processing x402 Payment...
                          </span>
                        ) : (
                          <span className="flex items-center gap-3">
                            Pay {metadata.price} USDC.e
                          </span>
                        )}
                    </Button>
                ) : (
                    <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 space-y-3">
                        <div className="flex items-center gap-3 text-primary">
                            <LucideCheckCircle className="w-6 h-6" />
                            <p className="font-black uppercase tracking-widest">Payment Confirmed</p>
                        </div>
                        {paymentTxHash && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transaction Hash</p>
                                <a 
                                    href={`https://explorer.cronos.org/testnet/tx/${paymentTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-primary hover:underline break-all"
                                >
                                    {paymentTxHash}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {!isConnected && (
                    <p className="text-center text-sm text-muted-foreground font-bold">
                        Connect your wallet to make a payment
                    </p>
                )}
            </div>

            <div className="pt-6 border-t border-white/5">
                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                    Powered by Cronos x402 Facilitator • Gasless USDC.e Payments
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
