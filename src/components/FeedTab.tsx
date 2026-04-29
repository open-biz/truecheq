'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  User,
} from 'lucide-react';
// Note: User icon is used for the 'Unverified' badge on listings
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { MiniKit } from '@worldcoin/minikit-js';
import { SEED_LISTINGS, type Listing, getVerificationLevel } from '@/lib/seed-listings';
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

function ListingCard({ listing, index, onChat, onSelect }: { listing: Listing; index: number; onChat: () => void; onSelect?: () => void }) {
  const sellerDisplay = listing.seller
    ? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left bg-card rounded-2xl overflow-hidden flex items-center gap-3 p-3 active:scale-[0.98] transition-transform cursor-pointer"
        onClick={() => onSelect?.()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); } }}
      >
        {/* Thumbnail */}
        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 bg-black/40">
          {listing.metadata?.images && listing.metadata.images.length > 0 ? (
            <img
              src={getProxiedImageUrl(listing.metadata.images[0])}
              alt={listing.metadata.itemName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20">TC</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Verification badge */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {(() => {
              const vl = getVerificationLevel(listing);
              return vl === 'orb' ? (
                <span className="inline-flex items-center gap-0.5 text-primary text-[9px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-2.5 h-2.5" /> ORB
                </span>
              ) : vl === 'device' ? (
                <span className="inline-flex items-center gap-0.5 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                  <Smartphone className="w-2.5 h-2.5" /> DEVICE
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-white/30 text-[9px] font-black uppercase tracking-widest">
                  <User className="w-2.5 h-2.5" /> UNVERIFIED
                </span>
              );
            })()}
          </div>
          <h3 className="text-sm font-black text-white truncate leading-snug">{listing.metadata?.itemName || 'Untitled'}</h3>
          {listing.metadata?.description && (
            <p className="text-xs text-white/40 truncate mt-0.5">{listing.metadata.description}</p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs font-black text-primary">${listing.metadata?.price || '0'} USDC</span>
            <span className="text-[10px] text-white/25 font-mono">{sellerDisplay}</span>
          </div>
        </div>

        {/* Chat button */}
        <button
          className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-primary transition-all active:scale-90"
          onClick={(e) => { e.stopPropagation(); onChat(); }}
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
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
        verificationLevel: user.verificationLevel,
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
        className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-card rounded-t-[2rem] p-6 max-h-[90vh] overflow-y-auto shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
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
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border border-dashed border-white/[0.06] bg-black/40 hover:bg-black/30 cursor-pointer transition-colors">
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
              className="w-full bg-black/40 border border-transparent rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
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
                className="w-full bg-black/40 border border-transparent rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
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
              className="w-full bg-black/40 border border-transparent rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none transition-all"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !itemName.trim() || !price.trim()}
            className="w-full rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed h-14 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98]"
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
// Component: Listing Detail Sheet
// ============================================================================

function ListingDetailSheet({
  listing,
  onClose,
  onChat,
}: {
  listing: Listing | null;
  onClose: () => void;
  onChat: () => void;
}) {
  if (!listing) return null;

  return (
    <AnimatePresence>
      {listing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card rounded-t-[2rem] p-6 max-h-[90vh] overflow-y-auto shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">Product Details</h2>
              <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Product Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5">
              {listing.metadata?.images && listing.metadata.images.length > 0 ? (
                <img
                  src={getProxiedImageUrl(listing.metadata.images[0])}
                  alt={listing.metadata.itemName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/[0.03] via-white/[0.06] to-white/[0.03] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white/20 relative z-10">TruCheq</span>
                </div>
              )}
              {/* Price badge */}
              <div className="absolute bottom-3 right-3">
                <Badge className="bg-primary text-primary-foreground text-sm font-black px-3 py-1 rounded-xl shadow-[0_0_12px_rgba(0,214,50,0.3)]">
                  ${listing.metadata?.price || listing.price || '0'} USDC
                </Badge>
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-2xl font-black text-white mb-2">{listing.metadata?.itemName || 'Untitled'}</h3>
            {listing.metadata?.description && (
              <p className="text-sm text-white/50 mb-5 leading-relaxed">{listing.metadata.description}</p>
            )}

            {/* Seller Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center">
                <User className="w-5 h-5 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/30 font-mono truncate">
                  {listing.seller ? `${listing.seller.slice(0, 8)}...${listing.seller.slice(-6)}` : ''}
                </p>
            {(() => {
              const vl = getVerificationLevel(listing);
              return vl === 'orb' ? (
                <div className="flex items-center gap-1 text-primary text-[10px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3" /> Orb Verified
                </div>
              ) : vl === 'device' ? (
                <div className="flex items-center gap-1 text-blue-400 text-[10px] font-black uppercase">
                  <Smartphone className="w-3 h-3" /> Device Verified
                </div>
              ) : (
                <div className="flex items-center gap-1 text-white/30 text-[10px] font-black uppercase">
                  <User className="w-3 h-3" /> Unverified
                </div>
              );
            })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 h-12 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-95"
                onClick={onChat}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with Seller
              </Button>
              <button
                className="rounded-xl h-12 px-4 bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
                onClick={() => {
                  const title = `Check out ${listing.metadata?.itemName || 'this item'} on TruCheq`;
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trucheq.com';
                  const url = `${origin}/deal/${listing.cid}?meta=${encodeURIComponent(listing.metadataUrl)}`;
                  if (MiniKit.isInstalled()) {
                    MiniKit.share({ title, url });
                  } else if (navigator.share) {
                    navigator.share({ title, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied');
                  }
                }}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
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
      {/* Page Header */}
      <div className="pb-1">
        <h1 className="text-2xl font-black text-white tracking-tight">Browse All Listings</h1>
        <p className="text-xs text-white/30 mt-0.5">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus-within:ring-1 focus-within:ring-primary/30 transition-all">
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
        <button
          className={cn(
            'rounded-2xl text-xs font-black shrink-0 h-11 px-3 transition-all active:scale-95',
            filterVerified
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_rgba(0,214,50,0.25)]'
              : 'bg-card text-white/60 hover:text-white hover:bg-white/[0.04]',
          )}
          onClick={() => setFilterVerified(!filterVerified)}
        >
          <ShieldCheck className="inline w-3.5 h-3.5 mr-1" />
          Verified
        </button>
      </div>

      {/* Listings Feed */}
      <div className="space-y-2">
        {filtered.map((listing, i) => (
          <ListingCard key={listing.cid} listing={listing} index={i} onChat={() => handleChat(listing)} onSelect={() => setSelectedListing(listing)} />
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
          className="fixed z-40 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_4px_20px_rgba(0,214,50,0.4)] hover:scale-110 active:scale-95 transition-all animate-pulse-glow"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 7.5rem)', right: '1.25rem' }}
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      )}

      <CreateListingSheet isOpen={showCreate} onClose={() => setShowCreate(false)} user={user!} onCreated={handleCreated} />

      <ListingDetailSheet
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        onChat={() => {
          if (selectedListing) handleChat(selectedListing);
        }}
      />
    </div>
  );
}
