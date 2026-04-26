'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LucideShieldCheck, LucideSmartphone, LucideWallet, LucideCheck, LucideLoader2 } from 'lucide-react';
import { WorldWalletButton } from './WorldWalletButton';
import { useAccount, useConnect } from 'wagmi';
import { cn, STORAGE_KEYS } from '@/lib/utils';
import { toast } from 'sonner';

// Types
export interface WorldIDBuyer {
  nullifierHash: string;
  isOrbVerified: boolean;
  verificationLevel: string;
  walletAddress?: string;
}

interface WorldIDBuyerAuthProps {
  onSuccess: (buyer: WorldIDBuyer, walletAddress?: string) => void;
  className?: string;
}

// Config
const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}` | undefined;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID;
const ACTION = 'trucheq_buyer_auth';

// Helper: Fetch RP context
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

// Component
export function WorldIDBuyerAuth({ onSuccess, className }: WorldIDBuyerAuthProps) {
  const [step, setStep] = useState<'world_id' | 'wallet' | 'complete'>('world_id');
  const [worldIdUser, setWorldIdUser] = useState<WorldIDBuyer | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  
  const { address: walletAddress, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  // Start World ID verification
  const startWorldIDFlow = async () => {
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

  const handleSuccess = useCallback((result: IDKitResult) => {
    const r = result as { responses?: Array<{ identifier?: string; nullifier?: string }>; nullifier?: string };
    const responses = r?.responses;
    const hasOrb = responses?.some(res => res.identifier === 'orb') ?? false;
    const nullifier = r?.responses?.[0]?.nullifier || r?.nullifier || 'unknown';

    const userData: WorldIDBuyer = {
      nullifierHash: nullifier,
      isOrbVerified: hasOrb,
      verificationLevel: hasOrb ? 'orb' : 'device',
    };
    
    setWorldIdUser(userData);
    setWidgetOpen(false);
    setStep('wallet');
    
    toast.success('World ID verified!', {
      description: hasOrb ? 'Orb verified buyer' : 'Device verified buyer',
    });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setWidgetOpen(open);
    if (!open) {
      setIsLoading(false);
    }
  }, []);

  // Handle wallet connection via WalletConnect
  const handleConnectWallet = () => {
    const wcConnector = connectors.find(c => c.id === 'walletConnect' || c.name.includes('WalletConnect'));
    if (wcConnector) {
      connect({ connector: wcConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      toast.error('No wallet connectors available');
    }
  };

  // Complete authentication when wallet is connected
  useEffect(() => {
    if (step === 'wallet' && isConnected && walletAddress && worldIdUser) {
      const combinedUser: WorldIDBuyer = {
        ...worldIdUser,
        walletAddress,
      };
      // Also save to localStorage for persistence
      localStorage.setItem(STORAGE_KEYS.BUYER, JSON.stringify(combinedUser));
      setStep('complete');
      onSuccess(combinedUser, walletAddress);
    }
  }, [step, isConnected, walletAddress, worldIdUser, onSuccess]);

  // ---- Authentication complete state ----
  if (step === 'complete' && worldIdUser && walletAddress) {
    return (
      <Card className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        worldIdUser.isOrbVerified ? 'border-t-primary/30' : 'border-t-blue-500/30',
        className,
      )}>
        <CardHeader className='text-center pb-2'>
          <div className='flex justify-center mb-4'>
            <div className={cn(
              'p-4 rounded-3xl border',
              worldIdUser.isOrbVerified
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            )}>
              {worldIdUser.isOrbVerified
                ? <LucideShieldCheck className='w-10 h-10' />
                : <LucideSmartphone className='w-10 h-10' />
              }
            </div>
          </div>

          <Badge variant='outline' className={cn(
            'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            worldIdUser.isOrbVerified
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          )}>
            {worldIdUser.isOrbVerified ? 'Orb Verified' : 'Device Verified'} - World ID
          </Badge>

          <CardTitle className='text-2xl font-black italic tracking-tighter'>
            Ready to Buy
          </CardTitle>
          <CardDescription className='text-xs font-bold uppercase tracking-widest opacity-50 mt-1'>
            World ID + {walletAddress.slice(0, 6)}... Wallet Connected
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3'>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
              <LucideWallet className='w-3 h-3' /> Your Payment Wallet
            </p>
            <div className='flex items-center gap-2'>
              <div className='flex-1 p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-white/70 truncate'>
                {walletAddress}
              </div>
              <LucideCheck className='w-5 h-5 text-primary' />
            </div>
          </div>

          <p className='text-center text-[10px] text-muted-foreground'>
            You can now chat with sellers and make payments
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- Wallet connection step ----
  if (step === 'wallet' && worldIdUser) {
    return (
      <Card className={cn(
        'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
        worldIdUser.isOrbVerified ? 'border-t-primary/30' : 'border-t-blue-500/30',
        className,
      )}>
        <CardHeader className='text-center pb-2'>
          <div className='flex justify-center mb-4'>
            <div className={cn(
              'p-4 rounded-3xl border',
              worldIdUser.isOrbVerified
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            )}>
              {worldIdUser.isOrbVerified
                ? <LucideShieldCheck className='w-10 h-10' />
                : <LucideSmartphone className='w-10 h-10' />
              }
            </div>
          </div>

          <Badge variant='outline' className={cn(
            'mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
            worldIdUser.isOrbVerified
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          )}>
            World ID Verified
          </Badge>

          <CardTitle className='text-2xl font-black italic tracking-tighter'>
            Connect Wallet to Pay
          </CardTitle>
          <CardDescription className='text-xs font-bold uppercase tracking-widest opacity-50 mt-1'>
            Connect World App or any EVM wallet
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6 pt-4'>
          <Button
            onClick={handleConnectWallet}
            className='w-full py-6 text-lg font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)]'
          >
            <LucideWallet className='w-5 h-5 mr-3' />
            Connect World App
          </Button>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-white/10' />
            </div>
            <div className='relative flex justify-center text-[10px] uppercase'>
              <span className='bg-black px-2 text-muted-foreground'>or</span>
            </div>
          </div>

          <div className='flex justify-center'>
            <WorldWalletButton size='lg' />
          </div>

          <p className='text-center text-[10px] uppercase tracking-widest text-muted-foreground'>
            Accepts World App, MetaMask, and other EVM wallets
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- World ID sign-in step ----
  return (
    <Card className={cn(
      'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden rounded-[2rem]',
      className,
    )}>
      <CardHeader className='text-center pb-2'>
        <div className='flex justify-center mb-4'>
          <div className='p-4 rounded-3xl bg-black/40 border border-white/10 text-muted-foreground'>
            <LucideShieldCheck className='w-10 h-10' />
          </div>
        </div>

        <Badge variant='outline' className='mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-muted-foreground border-white/10'>
          Sign In to Buy
        </Badge>

        <CardTitle className='text-2xl font-black italic tracking-tighter'>
          Verify with World ID
        </CardTitle>
        <CardDescription className='text-xs font-bold uppercase tracking-widest opacity-50 mt-1'>
          Required to purchase verified listings
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-6 pt-4'>
        <div className='p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary'>
              <LucideShieldCheck className='w-4 h-4' />
            </div>
            <div>
              <p className='text-xs font-black uppercase tracking-widest text-white'>Sybil Resistant</p>
              <p className='text-[10px] text-muted-foreground font-bold'>Prevents fake buyers and bot activity</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400'>
              <LucideWallet className='w-4 h-4' />
            </div>
            <div>
              <p className='text-xs font-black uppercase tracking-widest text-white'>One-Click Wallet</p>
              <p className='text-[10px] text-muted-foreground font-bold'>After verification, connect World App to pay</p>
            </div>
          </div>
        </div>

        {widgetError && (
          <div className='p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center'>
            <p className='text-xs font-bold text-destructive'>{widgetError}</p>
          </div>
        )}

        <Button
          onClick={startWorldIDFlow}
          disabled={isLoading}
          className='w-full py-8 text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_16px_32px_rgba(0,214,50,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? (
            <span className='flex items-center gap-2'>
              <LucideLoader2 className='w-4 h-4 animate-spin' />
              Preparing...
            </span>
          ) : (
            <span className='flex items-center gap-2'>
              <LucideShieldCheck className='w-5 h-5' />
              Sign In with World ID
            </span>
          )}
        </Button>

        {rpContext && (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={handleOpenChange}
            app_id={APP_ID!}
            action={ACTION}
            action_description='Authenticate with TruCheq as a buyer'
            allow_legacy_proofs={true}
            environment='staging'
            preset={orbLegacy()}
            rp_context={rpContext}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
          />
        )}

        <p className='text-center text-[10px] uppercase tracking-widest text-muted-foreground'>
          Orb and Device verification accepted
        </p>
      </CardContent>
    </Card>
  );
}