'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Wallet,
  Copy,
  LogOut,
  Tag,
  MessageCircle,
  Bot,
  Check,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TruCheqUser } from '@/lib/trucheq-user';
import { SEED_LISTINGS, type Listing } from '@/lib/seed-listings';
import { loadAgentRules, saveAgentRules, type AgentRules, DEFAULT_RULES } from '@/lib/agent';

interface ProfileTabProps {
  user: TruCheqUser;
  onLogout: () => void;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-xs text-white/80">{label}</span>
      <div className={cn('w-9 h-5 rounded-full transition-colors relative', checked ? 'bg-primary' : 'bg-white/10')}>
        <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </div>
    </button>
  );
}

export function ProfileTab({ user, onLogout }: ProfileTabProps) {
  const [userListings, setUserListings] = useState<Listing[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('trucheq_user_listings');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const allListings = [...SEED_LISTINGS, ...userListings];
  const myListings = allListings.filter((l) => l.seller.toLowerCase() === (user.walletAddress || '').toLowerCase());
  const [rules, setRules] = useState<AgentRules>(loadAgentRules);

  const updateRule = (patch: Partial<AgentRules>) => {
    const next = { ...rules, ...patch };
    setRules(next);
    saveAgentRules(next);
  };

  const copyAddress = () => {
    if (user.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      toast.success('Address copied');
    }
  };

  return (
    <div className="space-y-5">
      {/* Identity Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
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
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
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
        <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4 text-center">
          <Tag className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-black text-white">{myListings.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Listings</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-4 text-center">
          <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Deals</p>
        </div>
      </div>

      {/* Agent Settings */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#121212] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Your Agent</h3>
        </div>

        <Switch
          checked={rules.enabled}
          onChange={(v) => updateRule({ enabled: v })}
          label="Auto-negotiate when offline"
        />

        {rules.enabled && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
            <Switch
              checked={rules.autoAcceptAtAskingPrice}
              onChange={(v) => updateRule({ autoAcceptAtAskingPrice: v })}
              label="Auto-accept at asking price"
            />

            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1 block">
                Minimum acceptable (USDC)
              </label>
              <input
                type="number"
                value={rules.minimumAcceptable}
                onChange={(e) => updateRule({ minimumAcceptable: e.target.value })}
                placeholder="e.g. 40"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mb-1 block">
                Auto-reject below (USDC)
              </label>
              <input
                type="number"
                value={rules.autoRejectBelow}
                onChange={(e) => updateRule({ autoRejectBelow: e.target.value })}
                placeholder="e.g. 20"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <Switch
              checked={rules.counterOffer}
              onChange={(v) => updateRule({ counterOffer: v })}
              label="Counter-offer at minimum"
            />

            <div className="flex gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Check className="w-3 h-3 text-primary" /> Accept
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <X className="w-3 h-3 text-red-400" /> Reject
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowRightLeft className="w-3 h-3 text-yellow-400" /> Counter
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My Listings */}
      {myListings.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-white mb-3 uppercase tracking-widest">My Listings</h3>
          <div className="space-y-2">
            {myListings.map((l) => (
              <div key={l.cid} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#121212]">
                <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
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
        variant="ghost"
        className="w-full rounded-xl bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 font-black h-11 transition-colors"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
