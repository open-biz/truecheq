'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { MiniKit } from '@worldcoin/minikit-js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LucideShieldCheck, LucideSmartphone, LucideCopy, LucideCheck,
  LucideWallet, LucideQrCode, LucideLoader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  type TruCheqUser, 
  createTruCheqUser, 
  saveTruCheqUser, 
  loadTruCheqUser, 
  clearTruCheqUser,
  migrateToUnifiedUser,
} from '@/lib/trucheq-user';
import { getStoredWalletAddress } from '@/lib/wallet-client';

// ============================================================================
// Props
// ============================================================================

interface TruCheqAuthProps {
  /** Called when user is authenticated (either fresh or restored from storage) */
  onSuccess: (user: TruCheqUser) => void;
  className?: string;
  /** Skip wallet connection step (for mini-app where wallet is auto-connected) */
  skipWalletStep?: boolean;
}

// ============================================================================
// Config
// ============================================================================

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}` | undefined;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID;
const ACTION = 'trucheq_auth'; // Unified action — no more separate buyer/seller

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
// Helper: Get wallet address via MiniKit walletAuth (inside World App)
// NOTE: walletAuth is SIWE sign-in only — it does NOT verify World ID.
// MiniKit v2 removed commands.verify(). Actual World ID verification
// always goes through IDKit (which works in both World App and browser).
// walletAuth is used AFTER IDKit verification to auto-connect the wallet.
// ============================================================================

async function getMiniAppWalletAddress(): Promise<string | null> {
  if (!MiniKit.isInstalled()) return null;

  try {
    const nonce = crypto.randomUUID?.().replace(/-/g, '').slice(0, 12) || Date.now().toString(36).padStart(12, '0');

    const result = await MiniKit.walletAuth({
      nonce,
      statement: 'Connect your wallet to TruCheq',
    });

    if (result.executedWith === 'fallback') {
      console.warn('[MiniKit] walletAuth fell back — not in World App');
      return null;
    }

    // Success: data.address contains the user's World App wallet address
    return result.data.address;
  } catch (err) {
    console.error('[MiniKit] walletAuth failed:', err);
    return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export function TruCheqAuth({ onSuccess, className, skipWalletStep }: TruCheqAuthProps) {
  const [user, setUser] = useState<TruCheqUser | null>(null);
  const [step, setStep] = useState<'world_id' | 'wallet' | 'complete'>('world_id');
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const walletAddress = getStoredWalletAddress();
  const isConnected = !!walletAddress;

  // Try to restore user from localStorage on mount
  useEffect(() => {
    const existing = loadTruCheqUser() || migrateToUnifiedUser();
    if (existing) {
      setUser(existing);
      // If wallet is already connected OR skipWalletStep is true, go straight to complete
      if (existing.walletAddress || isConnected || skipWalletStep) {
        setStep('complete');
        onSuccess(existing);
      } else {
        setStep('wallet');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipWalletStep]);

  // When wallet is authenticated, update user and complete auth
  useEffect(() => {
    if (step === 'wallet' && isConnected && walletAddress && user) {
      const updated = { ...user, walletAddress };
      setUser(updated);
      saveTruCheqUser(updated);
      setStep('complete');
      onSuccess(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isConnected, walletAddress]);

  // ---- Start World ID verification (always via IDKit) ----
  // MiniKit v2 has no commands.verify() — walletAuth is SIWE only.
  // IDKit handles actual World ID verification in both World App and browser.
  const startVerification = async () => {
    setWidgetError(null);

    if (!RP_ID) {
      setWidgetError('RP_ID not configured');
      return;
    }

    setIsLoading(true);
    try {
      const context = await fetchRpContext(ACTION);
      setRpContext(context);
      setWidgetOpen(true);
    } catch (err) {
      setWidgetError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = useCallback((open: boolean) => {
    setWidgetOpen(open);
    if (!open) setIsLoading(false);
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

    // Always close the IDKit widget first so the modal never appears stuck.
    setWidgetOpen(false);
    setIsLoading(false);

    // NOTE: Do NOT call walletAuth here. AuthProvider owns walletAuth in
    // World App. This component is rendered only in standalone browser
    // (per AppShell), where there is no World App wallet to connect.
    const trucheqUser = createTruCheqUser({
      nullifierHash: nullifier,
      isOrbVerified: hasOrb,
      sessionId: r?.session_id,
      walletAddress: getStoredWalletAddress() || undefined,
    });

    setUser(trucheqUser);
    saveTruCheqUser(trucheqUser);
    toast.success('World ID verified!', {
      description: hasOrb ? 'Orb verified' : 'Device verified',
    });

    if (isConnected || skipWalletStep) {
      setStep('complete');
      onSuccess(trucheqUser);
    } else {
      setStep('wallet');
    }
  }, [onSuccess, isConnected, skipWalletStep]);

  const handleConnectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      toast.error('Please open this app in World App');
      return;
    }
    setIsLoading(true);
    try {
      const address = await getMiniAppWalletAddress();
      if (address) {
        toast.success('Wallet connected!');
      } else {
        toast.error('Wallet connection failed');
      }
    } catch {
      toast.error('Wallet connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    clearTruCheqUser();
    localStorage.removeItem('trucheq_wallet_auth');
    setStep('world_id');
  };

  // ========================================================================
  // RENDER: Complete state — user verified + wallet connected
  // ========================================================================
  if (step === 'complete' && user) {
    return (
      <Card className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        user.isOrbVerified ? 'border-t-primary/30' : 'border-t-blue-500/30',
        className,
      )}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className={cn(
              'p-4 rounded-3xl border',
              user.isOrbVerified
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            )}>
              {user.isOrbVerified ? <LucideShieldCheck className="w-10 h-10" /> : <LucideSmartphone className="w-10 h-10" />}
            </div>
          </div>

          <Badge variant="outline" className={cn(
            'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            user.isOrbVerified
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          )}>
            {user.isOrbVerified ? 'Orb Verified' : 'Device Verified'}
          </Badge>

          <CardTitle className="text-2xl font-black italic tracking-tighter">
            Identity Confirmed
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
            World ID • {user.isOrbVerified ? 'Proof of Personhood' : 'Device Check'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* TruCheq Code */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LucideQrCode className="w-3 h-3" /> Your TruCheq Code
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xl font-black text-primary tracking-widest text-center">
                {user.truCheqCode}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(user.truCheqCode);
                  setCopied(true);
                  toast.success('TruCheq code copied!');
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/10"
              >
                {copied ? <LucideCheck className="w-4 h-4 text-primary" /> : <LucideCopy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Share this code so others can find your listings
            </p>
          </div>

          {/* Wallet Address */}
          {(user.walletAddress || isConnected) && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <LucideWallet className="w-3 h-3" /> Payment Wallet
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-white/70 truncate">
                  {user.walletAddress || walletAddress}
                </div>
                <LucideCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
          )}

          {/* Logout */}
          <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground text-xs">
            Use different World ID
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // RENDER: Wallet connection step
  // ========================================================================
  if (step === 'wallet' && user) {
    return (
      <Card className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        user.isOrbVerified ? 'border-t-primary/30' : 'border-t-blue-500/30',
        className,
      )}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className={cn(
              'p-4 rounded-3xl border',
              user.isOrbVerified
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            )}>
              {user.isOrbVerified ? <LucideShieldCheck className="w-10 h-10" /> : <LucideSmartphone className="w-10 h-10" />}
            </div>
          </div>

          <Badge variant="outline" className={cn(
            'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            user.isOrbVerified
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          )}>
            World ID Verified
          </Badge>

          <CardTitle className="text-2xl font-black italic tracking-tighter">
            Connect Wallet
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
            To send/receive payments on TruCheq
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <Button
            onClick={handleConnectWallet}
            className="w-full py-6 text-lg font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)]"
          >
            <LucideWallet className="w-5 h-5 mr-3" />
            Connect World App
          </Button>
          <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            Wallet connection is available only in World App
          </p>
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // RENDER: World ID sign-in step (default)
  // ========================================================================
  return (
    <Card className={cn(
      'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
      className,
    )}>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-3xl bg-black/40 border border-white/10 text-muted-foreground">
            <LucideShieldCheck className="w-10 h-10" />
          </div>
        </div>

        <Badge variant="outline" className="mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-muted-foreground border-white/10">
          Sign In
        </Badge>

        <CardTitle className="text-2xl font-black italic tracking-tighter">
          Verify with World ID
        </CardTitle>
        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
          One identity for buying & selling
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <LucideShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">Orb Verified</p>
              <p className="text-[10px] text-muted-foreground font-bold">Full proof of personhood — highest trust</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <LucideSmartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">Device Verified</p>
              <p className="text-[10px] text-muted-foreground font-bold">Quick in-app verification</p>
            </div>
          </div>
        </div>

        {widgetError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs font-bold text-destructive">{widgetError}</p>
          </div>
        )}

        <Button
          onClick={startVerification}
          disabled={isLoading}
          className="w-full py-8 text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LucideLoader2 className="w-4 h-4 animate-spin" />
              {MiniKit.isInstalled() ? 'Opening World App...' : 'Preparing...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LucideShieldCheck className="w-5 h-5" />
              Sign In with World ID
            </span>
          )}
        </Button>

        {/* IDKit Widget — World ID verification (works in both World App and browser) */}
        {rpContext && (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={handleOpenChange}
            app_id={APP_ID!}
            action={ACTION}
            action_description="Authenticate with TruCheq"
            allow_legacy_proofs={true}
            environment={(process.env.NEXT_PUBLIC_WLD_ENV || 'production') as 'staging' | 'production'}
            preset={orbLegacy()}
            rp_context={rpContext}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
          />
        )}

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          One account — buy & sell on TruCheq
        </p>
      </CardContent>
    </Card>
  );
}
