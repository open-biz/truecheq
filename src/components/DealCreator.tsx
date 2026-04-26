'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorldWalletButton } from './WorldWalletButton';
import { useAccount } from 'wagmi';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LucidePackage, LucideAlertCircle, LucideCopy, LucideCheck, LucideTwitter, LucideMessageCircle, LucideImage, LucideX, LucideUpload, LucideShieldCheck, LucideWallet } from 'lucide-react';
import { cn, STORAGE_KEYS } from '@/lib/utils';
import { MiniKit } from '@worldcoin/minikit-js';
import type { DealMetadata } from '@/lib/filebase';

interface DealCreatorProps {
  isOrbVerified: boolean;
  walletAddress?: string;
}

export function DealCreator({ isOrbVerified, walletAddress: manualWallet }: DealCreatorProps) {
  const { address: walletAddress, isConnected } = useAccount();
  const address = walletAddress || manualWallet;
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [listingCid, setListingCid] = useState<string | null>(null);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ itemName?: string; price?: string }>({});
  const [touched, setTouched] = useState<{ itemName?: boolean; price?: boolean }>({});
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);



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
    setErrors({ itemName: itemNameError, price: priceError });
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
    if (!isConnected || !address) {
      toast.error("Wallet required to create listings - needed to receive payments");
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
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
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
        isOrbVerified,
      };

      const metadataFormData = new FormData();
      metadataFormData.append('type', 'metadata');
      metadataFormData.append('metadata', JSON.stringify(metadata));
      const metadataResponse = await fetch('/api/upload', { method: 'POST', body: metadataFormData });
      if (!metadataResponse.ok) throw new Error('Metadata upload failed');
      const { url: metaUrl, cid } = await metadataResponse.json();
      setMetadataUrl(metaUrl);
      setListingCid(cid);
      setIsUploading(false);

      // Persist listing to localStorage so DealDashboard can show it
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.USER_LISTINGS);
        const existing = stored ? JSON.parse(stored) : [];
        existing.push({
          cid,
          metadataUrl: metaUrl,
          seller: address as string,
          price,
          isOrbVerified,
          createdAt: Date.now(),
          metadata: {
            itemName,
            description: `Item: ${itemName}`,
            price,
            images: imageUrls,
            seller: address as string,
            isOrbVerified,
            createdAt: Date.now(),
          },
        });
        localStorage.setItem(STORAGE_KEYS.USER_LISTINGS, JSON.stringify(existing));
      } catch (e) {
        console.error('Failed to save listing to localStorage:', e);
      }

      toast.success("Listing created successfully!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error('Transaction error:', message);
      setIsUploading(false);
      if (message.includes('User rejected')) {
        toast.error("Transaction cancelled by user");
      } else if (message.includes('upload')) {
        toast.error("Upload failed. Please try again.");
      } else {
        toast.error("Transaction failed. Please try again.");
      }
    }
  };

  return (
    <Card className="max-w-xl mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-black italic flex items-center gap-3">
            <LucidePackage className="text-primary" /> Create Listing
          </CardTitle>
          <Badge
            variant="outline"
            className={isOrbVerified
              ? 'border-primary/40 text-primary bg-primary/10 text-[10px] font-black uppercase tracking-widest'
              : 'border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px] font-black uppercase tracking-widest'
            }
          >
            <LucideShieldCheck className="w-3 h-3 mr-1" />
            {isOrbVerified ? 'Orb Verified' : 'Device Verified'}
          </Badge>
        </div>
        <CardDescription>Generate a shareable link (USDC) for your item. Post it on Reddit, Discord, or anywhere.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="item-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>Item Name</span>
            <span className="text-[10px] font-normal opacity-50">{itemName.length}/100</span>
          </label>
          <Input
            id="item-name"
            placeholder="e.g. RTX 4090 GPU"
            value={itemName}
            onChange={(e) => { setItemName(e.target.value); if (touched.itemName) validateField('itemName'); }}
            onBlur={() => handleBlur('itemName')}
            maxLength={100}
            className={cn("bg-white/5 border-white/10 transition-colors", touched.itemName && errors.itemName && "border-destructive focus-visible:ring-destructive")}
          />
          {touched.itemName && errors.itemName && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1"><LucideAlertCircle className="w-3 h-3" />{errors.itemName}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (USDC)</label>
          <Input
            id="price"
            type="number"
            placeholder="300"
            value={price}
            onChange={(e) => { setPrice(e.target.value); if (touched.price) validateField('price'); }}
            onBlur={() => handleBlur('price')}
            step="any"
            min="0"
            className={cn("bg-white/5 border-white/10 transition-colors", touched.price && errors.price && "border-destructive focus-visible:ring-destructive")}
          />
          {touched.price && errors.price && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1"><LucideAlertCircle className="w-3 h-3" />{errors.price}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2"><LucideImage className="w-4 h-4" />Item Images (Optional)</span>
            <span className="text-[10px] font-normal opacity-50">{images.length}/5</span>
          </label>
          {imagePreviewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1.5 bg-black/80 hover:bg-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove image">
                    <LucideX className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <LucideUpload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-bold"><span className="font-black">Click to upload</span> or drag and drop</p>
              <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WEBP (MAX. 5 images)</p>
            </div>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={images.length >= 5} />
          </label>
        </div>

        {/* Wallet Notice - only shown when user hasn't connected */}
        {!isConnected && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
            <p className="text-xs text-blue-400 font-bold flex items-center gap-2">
              <LucideWallet className="w-4 h-4" />
              Connect your wallet to create listings and receive USDC payments
            </p>
            <div className="flex justify-center">
              <WorldWalletButton size='md' />
            </div>
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={isUploading || !isConnected}
          className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl disabled:opacity-50"
        >
          {isUploading ? "Uploading to IPFS..." : isConnected ? "Create Listing" : "Connect Wallet to Create"}
        </Button>

        {metadataUrl && listingCid && (
          <div className="mt-6 p-6 rounded-2xl bg-primary/10 border border-primary/30 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-2 text-primary mb-3">
              <LucideCheck className="w-5 h-5" />
              <p className="text-sm font-black uppercase tracking-widest">Listing Created Successfully!</p>
            </div>

            {metadataUrl && (
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metadata IPFS CID</p>
                <p className="text-xs font-mono text-primary break-all">{listingCid}</p>
              </div>
            )}

            {listingCid && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share This Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs break-all flex items-center">
                    {typeof window !== 'undefined' ? `${window.location.origin}/deal/${listingCid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl || '')}` : 'Generating link...'}
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${listingCid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                      if (!link) return;
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      toast.success('Link copied to clipboard!');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  >
                    {copied ? <LucideCheck className="w-4 h-4 text-primary" /> : <LucideCopy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {listingCid && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Share On</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${listingCid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                      const codeSnippet = `✅ TruCheq Verified Listing\nSecure Link: ${link}`;
                      navigator.clipboard.writeText(codeSnippet);
                      toast.success('Reddit code copied!');
                    }}
                    className="flex-1 rounded-xl border-white/10 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400 transition-colors"
                  >
                    <LucideCheck className="w-4 h-4 mr-2" />
                    Reddit Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${listingCid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                      const text = `Check out this ${itemName} on TruCheq! World ID verified seller with encrypted XMTP chat.`;
                      if (MiniKit.isInstalled()) {
                        navigator.clipboard.writeText(`${text}\n${link}`);
                        toast.success('Link copied — paste it in your social app!');
                      } else {
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                      }
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
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/deal/${listingCid.slice(0, 12)}?meta=${encodeURIComponent(metadataUrl || '')}` : '';
                      const text = `🔒 ${itemName} - ${price} USDC\n\nWorld ID verified seller on TruCheq:\n${link}`;
                      if (MiniKit.isInstalled()) {
                        navigator.clipboard.writeText(`${text}\n${link}`);
                        toast.success('Link copied — paste it in your social app!');
                      } else {
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                      }
                    }}
                    className="flex-1 rounded-xl border-white/10 hover:bg-blue-400/10 hover:border-blue-400/30 hover:text-blue-300 transition-colors"
                  >
                    <LucideMessageCircle className="w-4 h-4 mr-2" />
                    Telegram
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
