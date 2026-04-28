'use client';

import React, { useState } from 'react';
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
      <Card className="border-white/[0.08] bg-[#121212] overflow-hidden group">
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
              <Badge variant="outline" className="border-primary/30 text-primary bg-black/60 backdrop-blur text-[9px] font-black uppercase">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> Orb
              </Badge>
            ) : (
              <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-black/60 backdrop-blur text-[9px] font-black uppercase">
                <Smartphone className="w-3 h-3 mr-0.5" /> Device
              </Badge>
            )}
          </div>
          {/* Price overlay */}
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-primary text-primary-foreground text-sm font-black">
              ${listing.metadata?.price || '0'} USDC
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-black text-white mb-1">{listing.metadata?.itemName || 'Untitled'}</h3>
          {listing.metadata?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.metadata.description}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/40">
              {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10"
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
                <Share2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/10 text-xs font-black"
                onClick={onChat}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
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
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#121212] border-t border-white/[0.08] rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
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
              <label className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors">
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
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
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
                className="w-full bg-white/5 border border-white/[0.08] rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
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
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !itemName.trim() || !price.trim()}
            className="w-full rounded-xl bg-[#00D632] text-black font-black hover:bg-[#00D632]/90 h-12 text-sm"
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
  const [userListings, setUserListings] = useState<Listing[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(USER_LISTINGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const allListings = [...SEED_LISTINGS, ...userListings];

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl pl-11 pr-4 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant={filterVerified ? 'default' : 'outline'}
          className="rounded-xl text-xs font-black shrink-0"
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
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No listings found</p>
          </div>
        )}
      </div>

      {/* FAB for Create */}
      {user && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full bg-[#00D632] text-black flex items-center justify-center shadow-xl shadow-[#00D632]/30 hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

      <CreateListingSheet isOpen={showCreate} onClose={() => setShowCreate(false)} user={user!} onCreated={handleCreated} />
    </div>
  );
}
