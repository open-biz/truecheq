'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Plus,
  ShieldCheck,
  Smartphone,
  Search,
  X,
  MessageCircle,
  ImagePlus,
  Loader2,
  Share2,
} from 'lucide-react';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { MiniKit } from '@worldcoin/minikit-js';
import { SEED_LISTINGS, type Listing } from '@/lib/seed-listings';
import type { TruCheqUser } from '@/lib/trucheq-user';
import { uploadImageToFilebase, uploadMetadataToFilebase, getIPFSGatewayUrl, type DealMetadata } from '@/lib/filebase';

// ============================================================================
// Props
// ============================================================================

interface FeedTabProps {
  user?: TruCheqUser;
  guestMode?: boolean;
  onRequireAuth?: () => void;
  onChatSeller?: (sellerAddress: string) => void;
}

// ============================================================================
// Component: Listing Card
// ============================================================================

function ListingCard({ listing, index, onChat }: { listing: Listing; index: number; onChat: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl overflow-hidden group shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 rounded-3xl">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {listing.metadata?.images && listing.metadata.images.length > 0 ? (
            <img
              src={getProxiedImageUrl(listing.metadata.images[0])}
              alt={listing.metadata.itemName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-white/[0.03] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/20 relative z-10">TruCheq</span>
            </div>
          )}
          {/* Verification badge overlay */}
          <div className="absolute top-3 left-3">
            {listing.isOrbVerified ? (
              <Badge variant="outline" className="border-primary/30 text-primary bg-black/70 backdrop-blur-md text-[9px] font-black uppercase shadow-[0_0_12px_rgba(0,214,50,0.15)]">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> Orb
              </Badge>
            ) : (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-black/70 backdrop-blur-md text-[9px] font-black uppercase">
                <Smartphone className="w-3 h-3 mr-0.5" /> Device
              </Badge>
            )}
          </div>
          {/* Price overlay */}
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-[#00D632] text-black text-sm font-black px-3 py-1 rounded-xl shadow-[0_0_12px_rgba(0,214,50,0.3)]">
              ${listing.metadata?.price || '0'} USDC
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-black text-white tracking-tight mb-1">{listing.metadata?.itemName || 'Untitled'}</h3>
          <p className="text-sm text-primary font-bold mb-2">${listing.metadata?.price || '0'} USDC</p>
          {listing.metadata?.description && (
            <p className="text-xs text-white/40 line-clamp-2 mb-3">{listing.metadata.description}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-white/25">
              {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full h-9 w-9 p-0 text-white/40 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                onClick={() => {
                  const title = `Check out ${listing.metadata?.itemName || 'this item'} on TruCheq`;
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  if (MiniKit.isInstalled()) {
                    MiniKit.share({
                      title,
                      url,
                    });
                  } else if (navigator.share) {
                    navigator.share({ title, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard');
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/10 hover:text-primary text-xs font-black px-4 transition-all active:scale-95"
                onClick={onChat}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Component: Create Listing FAB / Sheet
// ============================================================================

function CreateListingSheet({ isOpen, onClose, user, onCreated }: { isOpen: boolean; onClose: () => void; user: TruCheqUser; onCreated: (listing: Listing) => void }) {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!itemName.trim() || !price.trim()) {
      toast.error('Item name and price are required');
      return;
    }
    if (!user.walletAddress) {
      toast.error('Wallet address not available');
      return;
    }

    setIsUploading(true);
    try {
      let imageCid = '';
      if (imageFile) {
        const imgResult = await uploadImageToFilebase(imageFile);
        imageCid = imgResult.cid;
      }

      const metadata: DealMetadata = {
        itemName: itemName.trim(),
        description: description.trim(),
        price,
        images: imageCid ? [getIPFSGatewayUrl(imageCid)] : [],
        seller: user.walletAddress,
        createdAt: Date.now(),
        isOrbVerified: user.isOrbVerified,
      };

      const metaResult = await uploadMetadataToFilebase(metadata);
      const newListing: Listing = {
        cid: metaResult.cid,
        seller: user.walletAddress,
        price,
        metadataUrl: getIPFSGatewayUrl(metaResult.cid),
        isOrbVerified: user.isOrbVerified,
        metadata,
      };

      onCreated(newListing);
      toast.success('Listing created!');
      // Reset form
      setItemName('');
      setPrice('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      onClose();
    } catch (err) {
      console.error('Create listing error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-[#070709]/95 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#16161A] border-t border-white/[0.06] rounded-t-[2rem] p-6 max-h-[90vh] overflow-y-auto shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white">Create Listing</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Image Upload */}
          <div className="mb-5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-2 block">
              Photo
            </label>
            {imagePreview ? (
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.08]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border border-dashed border-white/[0.06] bg-[#0f0f12] hover:bg-[#131318] cursor-pointer transition-colors">
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tap to upload photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            )}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1.5 block">
              Item Name *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Vintage Camera"
              className="w-full bg-[#0f0f12] border border-transparent rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1.5 block">
              Price (USDC) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-[#0f0f12] border border-transparent rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-black uppercase">USDC</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..."
              rows={3}
              className="w-full bg-[#0f0f12] border border-transparent rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none transition-all"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !itemName.trim() || !price.trim()}
            className="w-full rounded-xl bg-[#00D632] text-black font-black hover:bg-[#00D632]/90 disabled:opacity-40 disabled:cursor-not-allowed h-14 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading to IPFS...
              </>
            ) : (
              'Create Listing'
            )}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN: FeedTab
// ============================================================================

const USER_LISTINGS_KEY = 'trucheq_user_listings';

export function FeedTab({ user, guestMode, onRequireAuth, onChatSeller }: FeedTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [seedListings, setSeedListings] = useState<Listing[]>(SEED_LISTINGS);
  const [userListings, setUserListings] = useState<Listing[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(USER_LISTINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Fetch IPFS metadata for seed listings on mount
  useEffect(() => {
    async function fetchMetadata() {
      const enriched = await Promise.all(
        SEED_LISTINGS.map(async (listing) => {
          if (listing.metadata) return listing;
          try {
            const res = await fetch(listing.metadataUrl);
            if (res.ok) {
              const metadata = await res.json();
              return { ...listing, metadata };
            }
          } catch (e) {
            console.error(`Failed to fetch metadata for ${listing.cid}:`, e);
          }
          return listing;
        })
      );
      setSeedListings(enriched);
    }
    fetchMetadata();
  }, []);

  const allListings = [...seedListings, ...userListings];

  const filtered = allListings.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.metadata?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerified = !filterVerified || l.isOrbVerified;
    return matchesSearch && matchesVerified;
  });

  const handleCreated = (listing: Listing) => {
    setUserListings(prev => {
      const next = [listing, ...prev];
      localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleChat = (listing: Listing) => {
    if (guestMode) {
      onRequireAuth?.();
      toast.info('Sign in to chat with sellers');
      return;
    }
    onChatSeller?.(listing.seller);
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#16161A] border border-white/[0.06] rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={filterVerified ? 'default' : 'outline'}
          className={cn(
            'rounded-2xl text-xs font-black shrink-0 h-11 px-3 transition-all active:scale-95',
            filterVerified
              ? 'bg-[#00D632] text-black hover:bg-[#00D632]/90 shadow-[0_0_16px_rgba(0,214,50,0.25)]'
              : 'bg-[#16161A] border-white/[0.08] text-white/60 hover:text-white hover:bg-[#1c1c22]',
          )}
          onClick={() => setFilterVerified(!filterVerified)}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Verified
        </Button>
      </div>

      {/* Listings Feed */}
      <div className="space-y-4">
        {filtered.map((listing, i) => (
          <ListingCard key={listing.cid} listing={listing} index={i} onChat={() => handleChat(listing)} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto mb-4 text-white/15" />
            <p className="text-base font-bold text-white mb-1">No listings found</p>
            <p className="text-xs text-white/30">Try a different search term</p>
          </div>
        )}
      </div>

      {/* FAB for Create */}
      {user && !showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-32 right-5 z-40 w-16 h-16 rounded-full bg-[#00D632] text-black flex items-center justify-center shadow-[0_4px_20px_rgba(0,214,50,0.4)] hover:scale-110 active:scale-95 transition-all animate-pulse-glow"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      )}

      <CreateListingSheet isOpen={showCreate} onClose={() => setShowCreate(false)} user={user!} onCreated={handleCreated} />
    </div>
  );
}
