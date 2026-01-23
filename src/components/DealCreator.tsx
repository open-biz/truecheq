'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucidePackage, LucideLock, LucideLink, LucideAlertCircle, LucideCopy, LucideCheck, LucideShare2, LucideTwitter, LucideMessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [errors, setErrors] = useState<{ itemName?: string; price?: string; secret?: string }>({});
  const [touched, setTouched] = useState<{ itemName?: boolean; price?: boolean; secret?: boolean }>({});
  const [copied, setCopied] = useState(false);

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const validateItemName = (value: string): string | undefined => {
    if (!value.trim()) return 'Item name is required';
    if (value.length < 3) return 'Item name must be at least 3 characters';
    if (value.length > 100) return 'Item name must be less than 100 characters';
    return undefined;
  };

  const validatePrice = (value: string): string | undefined => {
    if (!value.trim()) return 'Price is required';
    const numPrice = parseFloat(value);
    if (isNaN(numPrice)) return 'Price must be a valid number';
    if (numPrice <= 0) return 'Price must be greater than 0';
    if (numPrice > 1000000) return 'Price seems unreasonably high';
    if (value.includes('.') && value.split('.')[1].length > 18) {
      return 'Price can have at most 18 decimal places';
    }
    return undefined;
  };

  const validateSecret = (value: string): string | undefined => {
    if (!value.trim()) return 'Hidden content is required';
    if (value.length < 10) return 'Hidden content must be at least 10 characters';
    if (value.length > 1000) return 'Hidden content must be less than 1000 characters';
    return undefined;
  };

  const handleBlur = (field: 'itemName' | 'price' | 'secret') => {
    setTouched({ ...touched, [field]: true });
    validateField(field);
  };

  const validateField = (field: 'itemName' | 'price' | 'secret') => {
    let error: string | undefined;
    if (field === 'itemName') error = validateItemName(itemName);
    if (field === 'price') error = validatePrice(price);
    if (field === 'secret') error = validateSecret(secret);
    setErrors({ ...errors, [field]: error });
    return !error;
  };

  const validateAll = (): boolean => {
    const itemNameError = validateItemName(itemName);
    const priceError = validatePrice(price);
    const secretError = validateSecret(secret);
    
    setErrors({
      itemName: itemNameError,
      price: priceError,
      secret: secretError,
    });
    setTouched({ itemName: true, price: true, secret: true });
    
    return !itemNameError && !priceError && !secretError;
  };

  const handleCreate = async () => {
    if (!validateAll()) {
        toast.error("Please fix the errors before continuing");
        return;
    }

    try {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'createDeal',
            args: [parseEther(price)],
        });
    } catch (e: any) {
        console.error('Transaction error:', e);
        if (e.message?.includes('User rejected')) {
            toast.error("Transaction cancelled by user");
        } else if (e.message?.includes('insufficient funds')) {
            toast.error("Insufficient funds for transaction");
        } else if (e.message?.includes('network')) {
            toast.error("Network error. Please check your connection.");
        } else {
            toast.error("Transaction failed. Please try again.");
        }
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
            <label htmlFor="item-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Item Name</span>
                <span className="text-[10px] font-normal opacity-50">{itemName.length}/100</span>
            </label>
            <Input 
                id="item-name"
                placeholder="e.g. Rolex Submariner" 
                value={itemName} 
                onChange={(e) => {
                    setItemName(e.target.value);
                    if (touched.itemName) validateField('itemName');
                }}
                onBlur={() => handleBlur('itemName')}
                maxLength={100}
                aria-invalid={touched.itemName && !!errors.itemName}
                aria-describedby={errors.itemName ? "item-name-error" : undefined}
                className={cn(
                    "bg-white/5 border-white/10 transition-colors",
                    touched.itemName && errors.itemName && "border-destructive focus-visible:ring-destructive"
                )}
            />
            {touched.itemName && errors.itemName && (
                <p id="item-name-error" className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                    <LucideAlertCircle className="w-3 h-3" />
                    {errors.itemName}
                </p>
            )}
        </div>
        <div className="space-y-2">
            <label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (CRO)</label>
            <Input 
                id="price"
                type="number" 
                placeholder="500" 
                value={price} 
                onChange={(e) => {
                    setPrice(e.target.value);
                    if (touched.price) validateField('price');
                }}
                onBlur={() => handleBlur('price')}
                step="any"
                min="0"
                aria-invalid={touched.price && !!errors.price}
                aria-describedby={errors.price ? "price-error" : undefined}
                className={cn(
                    "bg-white/5 border-white/10 transition-colors",
                    touched.price && errors.price && "border-destructive focus-visible:ring-destructive"
                )}
            />
            {touched.price && errors.price && (
                <p id="price-error" className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                    <LucideAlertCircle className="w-3 h-3" />
                    {errors.price}
                </p>
            )}
        </div>
        <div className="space-y-2">
            <label htmlFor="secret" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Hidden Content (Secret)</span>
                <span className="text-[10px] font-normal opacity-50">{secret.length}/1000</span>
            </label>
            <textarea 
                id="secret"
                placeholder="The link or info revealed after payment" 
                value={secret}
                onChange={(e) => {
                    setSecret(e.target.value);
                    if (touched.secret) validateField('secret');
                }}
                onBlur={() => handleBlur('secret')}
                maxLength={1000}
                aria-invalid={touched.secret && !!errors.secret}
                aria-describedby={errors.secret ? "secret-error" : undefined}
                className={cn(
                    "w-full h-32 bg-white/5 border border-white/10 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors",
                    touched.secret && errors.secret && "border-destructive focus:ring-destructive"
                )}
            />
            {touched.secret && errors.secret && (
                <p id="secret-error" className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                    <LucideAlertCircle className="w-3 h-3" />
                    {errors.secret}
                </p>
            )}
        </div>

        <Button 
            onClick={handleCreate} 
            disabled={isPending || isConfirming}
            className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl"
        >
            {isPending || isConfirming ? "Broadcasting..." : "Deploy TruCheq"}
        </Button>

        {isConfirmed && hash && (
            <div className="mt-6 p-6 rounded-2xl bg-primary/10 border border-primary/30 animate-in zoom-in-95 space-y-4">
                <div className="flex items-center gap-2 text-primary mb-3">
                    <LucideCheck className="w-5 h-5" />
                    <p className="text-sm font-black uppercase tracking-widest">Deal Created Successfully!</p>
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share This Link</label>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs break-all flex items-center">
                            {typeof window !== 'undefined' ? `${window.location.origin}/deal/${hash.slice(0, 10)}` : 'Loading...'}
                        </div>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                                const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${hash.slice(0, 10)}` : '';
                                navigator.clipboard.writeText(link);
                                setCopied(true);
                                toast.success('Link copied to clipboard!');
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                            aria-label="Copy link to clipboard"
                        >
                            {copied ? <LucideCheck className="w-4 h-4 text-primary" /> : <LucideCopy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share On</label>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${hash.slice(0, 10)}` : '';
                                const text = `Check out this ${itemName} on TruCheq! Secure P2P payment with escrow.`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                            }}
                            className="flex-1 rounded-xl border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-colors"
                        >
                            <LucideTwitter className="w-4 h-4 mr-2" />
                            Twitter
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${hash.slice(0, 10)}` : '';
                                const text = `🔒 ${itemName} - ${price} CRO\n\nSecure payment via TruCheq x402 escrow:\n${link}`;
                                window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex-1 rounded-xl border-white/10 hover:bg-blue-400/10 hover:border-blue-400/30 hover:text-blue-300 transition-colors"
                        >
                            <LucideMessageCircle className="w-4 h-4 mr-2" />
                            Telegram
                        </Button>
                    </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest">
                        Transaction Hash: {hash.slice(0, 8)}...{hash.slice(-6)}
                    </p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
