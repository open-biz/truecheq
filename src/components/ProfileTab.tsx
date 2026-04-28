'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Smartphone,
  Wallet,
  Copy,
  LogOut,
  Tag,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TruCheqUser } from '@/lib/trucheq-user';
import { SEED_LISTINGS } from '@/lib/seed-listings';

interface ProfileTabProps {
  user: TruCheqUser;
  onLogout: () => void;
}

export function ProfileTab({ user, onLogout }: ProfileTabProps) {
  const myListings = SEED_LISTINGS.filter((l) => l.seller.toLowerCase() === (user.walletAddress || '').toLowerCase());

  const copyAddress = () => {
    if (user.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      toast.success('Address copied');
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {user.isOrbVerified ? (
              <ShieldCheck className="w-6 h-6 text-primary" />
            ) : (
              <Smartphone className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {user.isOrbVerified ? 'Orb Verified' : 'Device Verified'}
            </h2>
            <p className="text-[10px] font-mono text-muted-foreground">{user.truCheqCode}</p>
          </div>
        </div>

        {user.walletAddress && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-white/70 truncate flex-1">
              {user.walletAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyAddress}>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <Tag className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-black text-white">{myListings.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Listings</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Deals</p>
        </div>
      </div>

      {/* My Listings */}
      {myListings.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-white mb-3 uppercase tracking-widest">My Listings</h3>
          <div className="space-y-2">
            {myListings.map((l) => (
              <div key={l.cid} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{l.metadata?.itemName}</p>
                  <p className="text-xs text-muted-foreground">${l.metadata?.price} USDC</p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0">
                  {l.isOrbVerified ? 'Orb' : 'Device'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-black"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
