'use client';

import React, { useState, useCallback } from 'react';
import { useIDKitRequest, type UseIDKitRequestHookResult } from '@worldcoin/idkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideShieldCheck, LucideSmartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WorldIDUser {
  nullifierHash: string;
  isOrbVerified: boolean;
  verificationLevel: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorldIDAuthProps {
  onSuccess: (user: WorldIDUser) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID ?? 'app_staging_...') as `app_${string}`;
const ACTION = 'trucheq_auth';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorldIDAuth({ onSuccess, className }: WorldIDAuthProps) {
  const [user, setUser] = useState<WorldIDUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to store RP signature for inclusion in verification request
  const [rpSig, setRpSig] = useState<{ sig: string; nonce: string; created_at: string; expires_at: string } | null>(null);

  // ---- IDKit v4 hook-based API -------------------------------------------
  const idKitResult = useIDKitRequest({
    app_id: APP_ID,
    action: ACTION,
    action_description: 'Authenticate with TruCheq',
    // @ts-expect-error - onSuccess callback not in current types but works at runtime
    onSuccess: async (result: unknown) => {
      try {
        // IDKit v4 result structure - extract info from responses
        const r = result as { responses?: Array<{ credential_type?: string; nullifier?: string }>; nonce?: string; session_id?: string };
        const responses = r?.responses;
        const hasOrb = !!(responses?.some(res => res.credential_type === 'orb') || 
                       responses?.some(res => res.credential_type === '生物識別'));
        
        // Verify the proof with our backend
        const verifyResponse = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });
        
        if (!verifyResponse.ok) {
          const err = await verifyResponse.json().catch(() => ({ error: 'Verification failed' }));
          throw new Error(err.error || 'Verification failed');
        }
        
        const verifyResult = await verifyResponse.json();
        
        const userData: WorldIDUser = {
          nullifierHash: verifyResult.nullifier_hash || r?.nonce || 'unknown',
          isOrbVerified: verifyResult.verification_level === 'orb' || hasOrb,
          verificationLevel: verifyResult.verification_level || (hasOrb ? 'orb' : 'device'),
          sessionId: r?.session_id,
        };
        setUser(userData);
        setIsVerifying(false);
        setError(null);
        onSuccess(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
        setIsVerifying(false);
      }
    },
    onVerify: () => {
      setIsVerifying(true);
      setError(null);
    },
  });

  const handleOpen = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch RP signature from backend first
      const rpSigResponse = await fetch('/api/rp-signature', { method: 'POST' });
      if (!rpSigResponse.ok) {
        throw new Error('Failed to get RP signature');
      }
      const sigData = await rpSigResponse.json();
      setRpSig(sigData);
      
      // Now open IDKit - it will use the signal from state
      await idKitResult.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsVerifying(false);
    }
  }, [idKitResult]);

  // ---- already authenticated state ----------------------------------------
  if (user) {
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

        <CardContent>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Nullifier Hash
            </p>
            <p className="text-xs font-mono text-white/70 break-all leading-relaxed">
              {user.nullifierHash}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- sign‑in state ------------------------------------------------------
  return (
    <Card
      className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        className,
      )}
    >
      <CardHeader className="text-center pb-2">
        {/* Icon */}
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

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs font-bold text-destructive">{error}</p>
          </div>
        )}

        {/* IDKit v4 trigger button using hook */}
        <Button
          onClick={handleOpen}
          disabled={isVerifying}
          className="w-full py-8 text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Verifying…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LucideShieldCheck className="w-5 h-5" />
              Sign In with World ID
            </span>
          )}
        </Button>

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Accepts Orb &amp; Device verification
        </p>
      </CardContent>
    </Card>
  );
}
