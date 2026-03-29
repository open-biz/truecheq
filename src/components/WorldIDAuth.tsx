'use client';

import React, { useState, useCallback } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LucideShieldCheck, LucideSmartphone, LucideCopy, LucideCheck, LucideWallet, LucideQrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldIDUser {
  nullifierHash: string;
  isOrbVerified: boolean;
  verificationLevel: string;
  sessionId?: string;
  // Wallet info (optional - for receiving payments)
  walletAddress?: string;
}

interface WorldIDAuthProps {
  onSuccess: (user: WorldIDUser) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}` | undefined;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID;
const ACTION = 'trucheq_auth';

// Generate short TruCheq code from nullifier (first 8 chars)
function generateTruCheqCode(nullifier: string): string {
  return nullifier.slice(0, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Helper: Fetch RP context
// ---------------------------------------------------------------------------

async function fetchRpContext(action: string): Promise<RpContext> {
  const response = await fetch('/api/rp-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RP context: ${response.statusText}`);
  }

  const { sig, nonce, created_at, expires_at } = await response.json();

  return {
    rp_id: RP_ID!,
    nonce,
    created_at,
    expires_at,
    signature: sig,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorldIDAuth({ onSuccess, className }: WorldIDAuthProps) {
  const [user, setUser] = useState<WorldIDUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Wallet input
  const [walletInput, setWalletInput] = useState('');
  const [showWalletInput, setShowWalletInput] = useState(false);

  // Start widget flow
  const startWidgetFlow = async () => {
    console.log('[WorldID] Starting widget flow...');
    setWidgetError(null);

    if (!RP_ID) {
      console.error('[WorldID] RP_ID not configured!');
      setWidgetError('RP_ID not configured');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[WorldID] Fetching rp-context...');
      const context = await fetchRpContext(ACTION);
      console.log('[WorldID] Got rp-context:', context);
      setRpContext(context);
      setWidgetOpen(true);
    } catch (err) {
      console.error('[WorldID] Widget error:', err);
      setWidgetError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = useCallback((open: boolean) => {
    console.log('[WorldID] Widget open changed:', open);
    setWidgetOpen(open);
    if (!open) {
      setIsLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async (result: IDKitResult) => {
    console.log('[WorldID] handleVerify called with result:', result);
    setIsVerifying(true);
    
    try {
      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devPortalPayload: result }),
      });

      if (!verifyResponse.ok) {
        const err = await verifyResponse.json().catch(() => ({ error: 'Verification failed' }));
        console.error('[WorldID] Verification failed:', err);
        throw new Error(err.error || 'Backend verification failed');
      }

      const verifyResult = await verifyResponse.json();
      console.log('[WorldID] Verification success:', verifyResult);
      return verifyResult;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleSuccess = useCallback((result: IDKitResult) => {
    console.log('[WorldID] handleSuccess called with:', result);
    
    const r = result as { responses?: Array<{ identifier?: string; nullifier?: string }>; nullifier?: string; session_id?: string };
    const responses = r?.responses;
    const hasOrb = responses?.some(res => res.identifier === 'orb') ?? false;
    const nullifier = r?.responses?.[0]?.nullifier || r?.nullifier || 'unknown';

    const userData: WorldIDUser = {
      nullifierHash: nullifier,
      isOrbVerified: hasOrb,
      verificationLevel: hasOrb ? 'orb' : 'device',
      sessionId: r?.session_id,
    };
    
    console.log('[WorldID] User data:', userData);
    setUser(userData);
    setWidgetOpen(false);
    setError(null);
    onSuccess(userData);
  }, [onSuccess]);

  const handleCopyCode = () => {
    if (user) {
      const code = generateTruCheqCode(user.nullifierHash);
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('TruCheq code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddWallet = () => {
    // Validate Ethereum address
    const addr = walletInput.trim();
    if (addr.length === 42 && addr.startsWith('0x')) {
      setUser(prev => prev ? { ...prev, walletAddress: addr } : null);
      setWalletInput('');
      setShowWalletInput(false);
      toast.success('Wallet address added!');
    } else {
      toast.error('Invalid Ethereum address');
    }
  };

  const handleConnectWallet = () => {
    // TODO: Implement proper WalletConnect with World App
    // For now, show the manual input option
    toast.info('WalletConnect coming soon! Enter address manually for now.');
    setShowWalletInput(true);
  };

  // ---- already authenticated state ----
  if (user) {
    const truCheqCode = generateTruCheqCode(user.nullifierHash);
    
    return (
      <Card
        className={cn(
          'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
          user.isOrbVerified ? 'border-t-primary/30' : 'border-t-blue-500/30',
          className,
        )}
      >
        <CardHeader className="text-center pb-2">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                'p-4 rounded-3xl border transition-colors',
                user.isOrbVerified
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400',
              )}
            >
              {user.isOrbVerified ? (
                <LucideShieldCheck className="w-10 h-10" />
              ) : (
                <LucideSmartphone className="w-10 h-10" />
              )}
            </div>
          </div>

          {/* Badge */}
          <Badge
            variant="outline"
            className={cn(
              'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
              user.isOrbVerified
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/40',
            )}
          >
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
                {truCheqCode}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyCode}
                className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/10"
              >
                {copied ? <LucideCheck className="w-4 h-4 text-primary" /> : <LucideCopy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Share this code so buyers can find your listings
            </p>
          </div>

          {/* Wallet Address */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LucideWallet className="w-3 h-3" /> Payment Wallet
            </p>
            {user.walletAddress ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-white/70 truncate">
                  {user.walletAddress}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWalletInput(true)}
                  className="text-xs text-muted-foreground hover:text-white"
                >
                  Change
                </Button>
              </div>
            ) : showWalletInput ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="0x..."
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    className="bg-black/40 border-white/10 text-xs font-mono"
                  />
                  <Button onClick={handleAddWallet} size="sm" className="rounded-xl">
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleConnectWallet}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-white/10 hover:bg-white/5"
                >
                  <LucideWallet className="w-4 h-4 mr-2" />
                  Connect Wallet (World App)
                </Button>
                <Button
                  onClick={() => setShowWalletInput(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-white"
                >
                  Or enter address manually
                </Button>
              </div>
            )}
          </div>

          {/* Nullifier Hash */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Nullifier Hash
            </p>
            <p className="text-xs font-mono text-white/50 break-all leading-relaxed">
              {user.nullifierHash.slice(0, 20)}...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- sign-in state ----
  return (
    <Card
      className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        className,
      )}
    >
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-3xl bg-black/40 border border-white/10 text-muted-foreground">
            <LucideShieldCheck className="w-10 h-10" />
          </div>
        </div>

        <Badge
          variant="outline"
          className="mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-muted-foreground border-white/10"
        >
          Verification Required
        </Badge>

        <CardTitle className="text-2xl font-black italic tracking-tighter">
          Verify Your Identity
        </CardTitle>
        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
          Powered by World ID
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Info box */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <LucideShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Orb Verified
              </p>
              <p className="text-[10px] text-muted-foreground font-bold">
                Full proof of personhood via biometric scan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <LucideSmartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">
                Device Verified
              </p>
              <p className="text-[10px] text-muted-foreground font-bold">
                Unique device check via World App
              </p>
            </div>
          </div>
        </div>

        {/* Widget Error */}
        {(error || widgetError) && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs font-bold text-destructive">{error || widgetError}</p>
          </div>
        )}

        {/* IDKit Widget */}
        <Button
          onClick={startWidgetFlow}
          disabled={isVerifying || isLoading}
          className="w-full py-8 text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying || isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {isLoading ? 'Preparing...' : 'Verifying…'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LucideShieldCheck className="w-5 h-5" />
              Sign In with World ID
            </span>
          )}
        </Button>

        {/* IDKit Widget - show when rpContext is loaded */}
        {rpContext && (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={handleOpenChange}
            app_id={APP_ID!}
            action={ACTION}
            action_description="Authenticate with TruCheq"
            allow_legacy_proofs={true}
            environment="staging"
            preset={orbLegacy()}
            rp_context={rpContext}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
          />
        )}

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Accepts Orb &amp; Device verification
        </p>
      </CardContent>
    </Card>
  );
}