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
      <div className="rounded-3xl border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_16px_rgba(0,214,50,0.1)]">
            {user.isOrbVerified ? (
              <ShieldCheck className="w-6 h-6 text-primary" />
            ) : (
              <Smartphone className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              {user.isOrbVerified ? 'Orb Verified' : 'Device Verified'}
            </h2>
            <p className="text-[10px] font-mono text-white/30">{user.truCheqCode}</p>
          </div>
        </div>

        {user.walletAddress && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0f0f12] border border-white/[0.06]">
            <Wallet className="w-4 h-4 text-white/30 shrink-0" />
            <span className="text-xs font-mono text-white/50 truncate flex-1">
              {user.walletAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-white/[0.06]" onClick={copyAddress}>
              <Copy className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl p-4 text-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#1c1c22] transition-colors">
          <Tag className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-2xl font-black text-white">{myListings.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Listings</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl p-4 text-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#1c1c22] transition-colors">
          <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Deals</p>
        </div>
      </div>

      {/* Agent Settings */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border-l-2 border-l-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
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
              <div key={l.cid} className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-[#16161A]/90 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#1c1c22] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{l.metadata?.itemName}</p>
                  <p className="text-xs text-primary font-medium">${l.metadata?.price} USDC</p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0 border-white/[0.08] text-white/40">
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
        className="w-full rounded-2xl bg-transparent border border-white/[0.06] text-white/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 font-black h-12 transition-all active:scale-[0.98]"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
