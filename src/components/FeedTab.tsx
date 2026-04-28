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
  DollarSign,
  Share2,
} from 'lucide-react';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { MiniKit } from '@worldcoin/minikit-js';
import { SEED_LISTINGS, type Listing } from '@/lib/seed-listings';
import type { TruCheqUser } from '@/lib/trucheq-user';

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
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl overflow-hidden group">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {listing.metadata?.images && listing.metadata.images.length > 0 ? (
            <img
              src={getProxiedImageUrl(listing.metadata.images[0])}
              alt={listing.metadata.itemName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <DollarSign className="w-12 h-12 text-white/10" />
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
          <h3 className="text-base font-black text-white mb-1">{listing.metadata?.itemName || 'Untitled'}</h3>
          {listing.metadata?.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.metadata.description}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">
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

function CreateListingSheet({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: TruCheqUser }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#0A0F14] border-t border-white/10 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white">Create Listing</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Listing creation form goes here. (Re-use DealCreator logic)
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN: FeedTab
// ============================================================================

export function FeedTab({ user, guestMode, onRequireAuth, onChatSeller }: FeedTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);

  const filtered = SEED_LISTINGS.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.metadata?.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerified = !filterVerified || l.isOrbVerified;
    return matchesSearch && matchesVerified;
  });

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
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
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
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <CreateListingSheet isOpen={showCreate} onClose={() => setShowCreate(false)} user={user!} />
    </div>
  );
}
