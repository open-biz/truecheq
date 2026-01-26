'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseUnits, decodeEventLog } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { LucidePackage, LucideAlertCircle, LucideCopy, LucideCheck, LucideTwitter, LucideMessageCircle, LucideImage, LucideX, LucideUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealMetadata } from '@/lib/filebase';

const REGISTRIES: Record<number, string> = {
    338: '0xAC50c91ced2122EE2E2c7310b279387e0cA1cF91', // Cronos Testnet
    84532: '0x0000000000000000000000000000000000000000' // Base Sepolia (Placeholder)
};

const ABI = [
  {"inputs":[{"internalType":"uint256","name":"_price","type":"uint256"},{"internalType":"string","name":"_metadataCid","type":"string"}],"name":"createDeal","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
] as const;

export function DealCreator() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [dealId, setDealId] = useState<bigint | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ itemName?: string; price?: string }>({});
  const [touched, setTouched] = useState<{ itemName?: boolean; price?: boolean }>({});
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (isConfirmed && receipt) {
        // Parse logs to find DealCreated event
        const log = receipt.logs.find(l => {
            try {
                const event = decodeEventLog({
                    abi: ABI,
                    data: l.data,
                    topics: l.topics,
                });
                return event.eventName === 'DealCreated';
            } catch {
                return false;
            }
        });

        if (log) {
            const event = decodeEventLog({
                abi: ABI,
                data: log.data,
                topics: log.topics,
            });
            // @ts-ignore
            setDealId(event.args.dealId);
        }
    }
  }, [isConfirmed, receipt]);

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
    return undefined;
  };

  const handleBlur = (field: 'itemName' | 'price') => {
    setTouched({ ...touched, [field]: true });
    validateField(field);
  };

  const validateField = (field: 'itemName' | 'price') => {
    let error: string | undefined;
    if (field === 'itemName') error = validateItemName(itemName);
    if (field === 'price') error = validatePrice(price);
    setErrors({ ...errors, [field]: error });
    return !error;
  };

  const validateAll = (): boolean => {
    const itemNameError = validateItemName(itemName);
    const priceError = validatePrice(price);
    
    setErrors({
      itemName: itemNameError,
      price: priceError,
    });
    setTouched({ itemName: true, price: true });
    
    return !itemNameError && !priceError;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImages([...images, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!validateAll()) {
        toast.error("Please fix the errors before continuing");
        return;
    }

    if (!address) {
        toast.error("Please connect your wallet");
        return;
    }

    const registryAddress = REGISTRIES[chainId];
    if (!registryAddress) {
        toast.error("Unsupported network. Please switch to Cronos Testnet or Base Sepolia.");
        return;
    }

    try {
        setIsUploading(true);
        toast.info("Uploading images to IPFS...");

        const imageUrls: string[] = [];
        for (const image of images) {
            const formData = new FormData();
            formData.append('type', 'image');
            formData.append('file', image);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error('Image upload failed');
            const { url } = await response.json();
            imageUrls.push(url);
        }

        toast.info("Uploading metadata to IPFS...");

        const metadata: DealMetadata = {
            itemName,
            description: `Item: ${itemName}`,
            price,
            images: imageUrls,
            seller: address,
            createdAt: Date.now(),
            chainId,
        };

        const metadataFormData = new FormData();
        metadataFormData.append('type', 'metadata');
        metadataFormData.append('metadata', JSON.stringify(metadata));
        
        const metadataResponse = await fetch('/api/upload', {
            method: 'POST',
            body: metadataFormData,
        });
        
        if (!metadataResponse.ok) throw new Error('Metadata upload failed');
        const { url: metaUrl, cid } = await metadataResponse.json();
        setMetadataUrl(metaUrl);

        toast.success("Metadata uploaded to IPFS!");
        setIsUploading(false);

        toast.info("Registering deal on blockchain...");
        
        if (registryAddress === '0x0000000000000000000000000000000000000000') {
            toast.warning("Contract not deployed on this network yet.");
            return;
        }

        writeContract({
            address: registryAddress as `0x${string}`,
            abi: ABI,
            functionName: 'createDeal',
            args: [parseUnits(price, 6), cid], // USDC 6 decimals
        });
    } catch (e: any) {
        console.error('Transaction error:', e);
        setIsUploading(false);
        if (e.message?.includes('User rejected')) {
            toast.error("Transaction cancelled by user");
        } else if (e.message?.includes('insufficient funds')) {
            toast.error("Insufficient funds for transaction");
        } else if (e.message?.includes('network')) {
            toast.error("Network error. Please check your connection.");
        } else if (e.message?.includes('upload')) {
            toast.error("Upload failed. Please try again.");
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
        <CardDescription>Generate a secure x402 payment link (USDC) for your item.</CardDescription>
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
            <label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (USDC)</label>
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
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <LucideImage className="w-4 h-4" />
                    Item Images (Optional)
                </span>
                <span className="text-[10px] font-normal opacity-50">{images.length}/5</span>
            </label>
            
            {imagePreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                            <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-1.5 bg-black/80 hover:bg-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove image"
                            >
                                <LucideX className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <LucideUpload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-bold">
                        <span className="font-black">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WEBP (MAX. 5 images)</p>
                </div>
                <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={images.length >= 5}
                />
            </label>
        </div>

        <Button 
            onClick={handleCreate} 
            disabled={isPending || isConfirming || isUploading}
            className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl disabled:opacity-50"
        >
            {isUploading ? "Uploading to IPFS..." : isPending || isConfirming ? "Broadcasting..." : "Deploy TruCheq"}
        </Button>

        {isConfirmed && hash && (
            <div className="mt-6 p-6 rounded-2xl bg-primary/10 border border-primary/30 animate-in zoom-in-95 space-y-4">
                <div className="flex items-center gap-2 text-primary mb-3">
                    <LucideCheck className="w-5 h-5" />
                    <p className="text-sm font-black uppercase tracking-widest">Deal Created Successfully!</p>
                </div>
                
                {metadataUrl && (
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metadata IPFS URL</p>
                        <p className="text-xs font-mono text-primary break-all">{metadataUrl}</p>
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share This Link</label>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs break-all flex items-center">
                            {typeof window !== 'undefined' && dealId !== null ? `${window.location.origin}/deal/${dealId}?meta=${encodeURIComponent(metadataUrl || '')}` : 'Loading Deal ID...'}
                        </div>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                                const link = typeof window !== 'undefined' && dealId !== null ? `${window.location.origin}/deal/${dealId}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                                if (!link) return;
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
                                const link = typeof window !== 'undefined' && dealId !== null ? `${window.location.origin}/deal/${dealId}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
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
                                const link = typeof window !== 'undefined' && dealId !== null ? `${window.location.origin}/deal/${dealId}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                                const text = `🔒 ${itemName} - ${price} USDC\n\nSecure payment via TruCheq x402 escrow:\n${link}`;
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