'use client';

import React, { useState, useCallback } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
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
  Bot,
  Check,
  X,
  ArrowRightLeft,
  LucideLoader2,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  type TruCheqUser,
  createTruCheqUser,
  saveTruCheqUser,
} from '@/lib/trucheq-user';
import { SEED_LISTINGS, type Listing, getVerificationLevel } from '@/lib/seed-listings';
import { loadAgentRules, saveAgentRules, type AgentRules } from '@/lib/agent';
import { useAuth } from '@/lib/auth-provider';

// ============================================================================
// Types & Config
// ============================================================================

interface ProfileTabProps {
  user: TruCheqUser;
  onLogout: () => void;
}

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}` | undefined;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID;
const ACTION = 'trucheq_auth';

// ============================================================================
// Helper: Fetch RP context for IDKit
// ============================================================================

async function fetchRpContext(action: string): Promise<RpContext> {
  const response = await fetch('/api/rp-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error(`Failed to fetch RP context: ${response.statusText}`);
  const { sig, nonce, created_at, expires_at } = await response.json();
  return { rp_id: RP_ID!, nonce, created_at, expires_at, signature: sig };
}

// ============================================================================
// Sub-components
// ============================================================================

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

function VerificationStatusPill({ level }: { level: TruCheqUser['verificationLevel'] }) {
  const config = {
    none: { icon: <AlertCircle className="w-4 h-4" />, label: 'Not Verified', color: 'text-white/40 bg-white/[0.06] border-white/[0.08]' },
    device: { icon: <Smartphone className="w-4 h-4" />, label: 'Device Verified', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    orb: { icon: <ShieldCheck className="w-4 h-4" />, label: 'Orb Verified', color: 'text-primary bg-primary/10 border-primary/20' },
  };
  const c = config[level];
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest', c.color)}>
      {c.icon}
      {c.label}
    </div>
  );
}

// ============================================================================
// MAIN: ProfileTab
// ============================================================================

export function ProfileTab({ user, onLogout }: ProfileTabProps) {
  const { setUser } = useAuth();
  const [userListings] = useState<Listing[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('trucheq_user_listings');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const allListings = [...SEED_LISTINGS, ...userListings];
  const myListings = allListings.filter((l) => l.seller.toLowerCase() === (user.walletAddress || '').toLowerCase());
  const [rules, setRules] = useState<AgentRules>(loadAgentRules);

  // World ID Verification state
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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

  // ---- Start World ID verification ----
  const startVerification = async () => {
    setVerifyError(null);
    if (!RP_ID) {
      setVerifyError('RP_ID not configured');
      return;
    }
    setIsVerifying(true);
    try {
      const context = await fetchRpContext(ACTION);
      setRpContext(context);
      setWidgetOpen(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenChange = useCallback((open: boolean) => {
    setWidgetOpen(open);
    if (!open) setIsVerifying(false);
  }, []);

  const handleVerify = useCallback(async (result: IDKitResult) => {
    const verifyResponse = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devPortalPayload: result }),
    });
    if (!verifyResponse.ok) {
      const err = await verifyResponse.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || 'Backend verification failed');
    }
    return verifyResponse.json();
  }, []);

  const handleSuccess = useCallback(async (result: IDKitResult) => {
    const r = result as { responses?: Array<{ identifier?: string; nullifier?: string }>; nullifier?: string; session_id?: string };
    const responses = r?.responses;
    const hasOrb = responses?.some(res => res.identifier === 'orb') ?? false;
    const nullifier = r?.responses?.[0]?.nullifier || r?.nullifier || 'unknown';

    // Always close the IDKit widget first
    setWidgetOpen(false);
    setIsVerifying(false);

    // Update the user with World ID verification data
    const updated = createTruCheqUser({
      walletAddress: user.walletAddress,
      nullifierHash: nullifier,
      isOrbVerified: hasOrb,
      sessionId: r?.session_id,
    });
    // Preserve createdAt from original user
    const final = { ...updated, createdAt: user.createdAt };
    saveTruCheqUser(final);

    // Update AuthProvider context — no full page reload needed
    setUser(final);

    toast.success('World ID verified!', {
      description: hasOrb ? 'Orb verified — highest trust' : 'Device verified',
    });
  }, [user, setUser]);

  const isVerified = user.verificationLevel !== 'none';

  return (
    <div className="space-y-5">
      {/* Wallet Identity Card */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-full border flex items-center justify-center shadow-[0_0_16px_rgba(0,214,50,0.1)]',
            isVerified
              ? 'bg-primary/20 border-primary/20'
              : 'bg-white/[0.06] border-white/[0.08]',
          )}>
            {user.verificationLevel === 'orb' ? (
              <ShieldCheck className="w-6 h-6 text-primary" />
            ) : user.verificationLevel === 'device' ? (
              <Smartphone className="w-6 h-6 text-blue-400" />
            ) : (
              <Wallet className="w-6 h-6 text-white/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight">
              {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'No Wallet'}
            </h2>
            <VerificationStatusPill level={user.verificationLevel} />
          </div>
        </div>

        {/* Wallet Address */}
        {user.walletAddress && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40">
            <Wallet className="w-4 h-4 text-white/30 shrink-0" />
            <span className="text-xs font-mono text-white/50 truncate flex-1">
              {user.walletAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-white/[0.06]" onClick={copyAddress}>
              <Copy className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
            </Button>
          </div>
        )}

        {/* TruCheq Code */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 mt-2">
          <Tag className="w-4 h-4 text-primary/50 shrink-0" />
          <span className="text-xs text-white/30">TruCheq Code</span>
          <span className="text-xs font-mono text-primary font-black ml-auto">{user.truCheqCode}</span>
        </div>
      </div>

      {/* Verify with World ID — only shown if not yet verified */}
      {!isVerified && (
        <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Verify Identity</h3>
          </div>
          <p className="text-xs text-white/40 mb-4 leading-relaxed">
            Verify with World ID to get a trust badge on your listings. Orb verification provides the highest level of trust — Device verification is a quick alternative.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-black text-white">Orb Verified</p>
                <p className="text-[10px] text-white/40">Biometric proof of personhood</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-black text-white">Device Verified</p>
                <p className="text-[10px] text-white/40">Quick phone-based verification</p>
              </div>
            </div>
          </div>
          {verifyError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center mb-3">
              <p className="text-xs font-bold text-destructive">{verifyError}</p>
            </div>
          )}
          <Button
            onClick={startVerification}
            disabled={isVerifying}
            className="w-full rounded-xl bg-primary text-primary-foreground font-black h-12 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98]"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <LucideLoader2 className="w-4 h-4 animate-spin" />
                Preparing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Verify with World ID
              </span>
            )}
          </Button>

        </div>
      )}

      {/* Verified status — shown if already verified */}
      {isVerified && (
        <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              user.verificationLevel === 'orb' ? 'bg-primary/10' : 'bg-blue-500/10',
            )}>
              {user.verificationLevel === 'orb' ? (
                <ShieldCheck className="w-4 h-4 text-primary" />
              ) : (
                <Smartphone className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Identity Verified</h3>
          </div>
          <p className="text-xs text-white/40 mb-3">
            Your {user.verificationLevel === 'orb' ? 'Orb' : 'Device'} verification is active. Your listings show a trust badge.
          </p>
          <Button
            variant="outline"
            onClick={startVerification}
            disabled={isVerifying}
            className="w-full rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06] h-10 text-xs font-black uppercase tracking-widest"
          >
            {isVerifying ? (
              <LucideLoader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-3 h-3 mr-2" />
            )}
            Re-verify
          </Button>
        </div>
      )}

      {/* IDKit Widget — single instance for both verify and re-verify */}
      {rpContext && (
        <IDKitRequestWidget
          open={widgetOpen}
          onOpenChange={handleOpenChange}
          app_id={APP_ID!}
          action={ACTION}
          action_description="Verify your identity on TruCheq"
          allow_legacy_proofs={true}
          environment={(process.env.NEXT_PUBLIC_WLD_ENV || 'production') as 'staging' | 'production'}
          preset={orbLegacy()}
          rp_context={rpContext}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
        />
      )}

      {/* Fund Account */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <PlusCircle className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Fund Account</h3>
        </div>
        <p className="text-xs text-white/40 mb-3">
          Add USDC to your wallet to start buying or accept payments as a seller.
        </p>
        <Button
          onClick={() => toast.info('Not implemented yet — coming soon!')}
          className="w-full rounded-xl bg-white/[0.06] text-white/70 font-black h-10 text-xs uppercase tracking-widest hover:bg-white/[0.10] hover:text-white transition-all"
        >
          <PlusCircle className="w-3 h-3 mr-2" />
          Fund Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card/90 backdrop-blur-xl p-4 text-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-card/95 transition-colors">
          <Tag className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-2xl font-black text-white">{myListings.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Listings</p>
        </div>
        <div className="rounded-2xl bg-card/90 backdrop-blur-xl p-4 text-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-card/95 transition-colors">
          <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="text-2xl font-black text-white">0</p>
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-black">Deals</p>
        </div>
      </div>

      {/* Agent Settings */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
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
                className="w-full bg-white/[0.03] border-transparent rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                className="w-full bg-white/[0.03] border-transparent rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
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
              <div key={l.cid} className="flex items-center gap-3 p-3 rounded-2xl bg-card/90 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-card/95 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{l.metadata?.itemName}</p>
                  <p className="text-xs text-primary font-medium">${l.metadata?.price} USDC</p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0 border-white/[0.08] text-white/40">
                  {getVerificationLevel(l) === 'orb' ? 'Orb' : getVerificationLevel(l) === 'device' ? 'Device' : 'Unverified'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign Out */}
      <Button
        variant="ghost"
        className="w-full rounded-2xl bg-transparent text-white/30 hover:bg-red-500/10 hover:text-red-400 font-black h-12 transition-all active:scale-[0.98]"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
