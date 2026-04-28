'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LucideCheck,
  LucideX,
  LucideLoader2,
  LucideGlobe,
  LucideChevronDown,
  LucideCopy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniKit } from '@worldcoin/minikit-js';
import { toast } from 'sonner';
import { walletAuth } from '@/auth/wallet';
import { worldChain, worldChainSepolia } from '@/lib/chains';
import { BASE_CHAIN_NUM } from '@/lib/x402';

// World Chain config
const WORLD_CHAIN_ID = worldChain.id; // 480
const WORLD_CHAIN_SEPOLIA_ID = worldChainSepolia.id; // 4801

// Get explorer URL based on chain
function getExplorerUrl(chainId: number): string {
  if (chainId === WORLD_CHAIN_ID) {
    return 'https://worldchain-mainnet.g.alchemy.com/explorer';
  }
  if (chainId === WORLD_CHAIN_SEPOLIA_ID) {
    return 'https://worldchain-sepolia.g.alchemy.com/explorer';
  }
  // Base mainnet + Sepolia
  if (chainId === 8453 || chainId === 84532) {
    return chainId === 8453 
      ? 'https://basescan.org' 
      : 'https://sepolia.basescan.org';
  }
  return '';
}

// Copy address to clipboard
async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address);
    toast.success('Address copied!');
  } catch {
    toast.error('Failed to copy');
  }
}

interface WorldWalletButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showChainStatus?: boolean;
  className?: string;
}

export function WorldWalletButton({
  variant = 'primary',
  size = 'md',
  showChainStatus = true,
  className
}: WorldWalletButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // Check if running inside World App webview
  const isInsideWorldApp = MiniKit.isInstalled();

  const handleWalletAuth = useCallback(async () => {
    if (!isInsideWorldApp || isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const result = await walletAuth();
      setAddress(result.address);
      // Store the auth result for later use
      localStorage.setItem('trucheq_wallet_auth', JSON.stringify(result));
      toast.success('Wallet authenticated!');
      setShowModal(false);
    } catch (error) {
      console.error('Wallet auth error:', error);
      toast.error('Authentication failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAuthenticating(false);
    }
  }, [isInsideWorldApp, isAuthenticating]);

  // Restore stored wallet address on mount (no auto walletAuth — that triggers SIWE/Safari handoff)
  useEffect(() => {
    const stored = localStorage.getItem('trucheq_wallet_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.address) setAddress(parsed.address);
      } catch {
        localStorage.removeItem('trucheq_wallet_auth');
      }
    }
  }, []);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg',
    secondary: 'bg-white/10 border border-white/20 text-white hover:bg-white/20',
    ghost: 'bg-transparent text-muted-foreground hover:text-white hover:bg-white/10',
  };

  // ---- Connected state ----
  if (address) {
    return (
      <>
        <div className={cn('relative', className)}>
          <Button
            variant='ghost'
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              'flex items-center gap-2 font-mono bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl',
              sizeClasses[size],
              'text-primary'
            )}
          >
            {showChainStatus && (
              <div className='w-2 h-2 rounded-full bg-primary' />
            )}
            <span>🌍</span>
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            <LucideChevronDown className={cn('w-4 h-4 transition-transform', showDropdown && 'rotate-180')} />
          </Button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute right-0 top-full mt-2 z-50',
                  'w-64 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden'
                )}
              >
                {/* Wallet Type */}
                <div className='p-4 border-b border-white/10'>
                  <Badge variant='outline' className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40'>
                    🌏 World App
                  </Badge>
                </div>

                {/* Address */}
                <div className='p-4 border-b border-white/10'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2'>
                    World App Wallet
                  </p>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-mono text-white'>{address}</span>
                    <button 
                      onClick={() => copyAddress(address)}
                      className='p-1 rounded hover:bg-white/10'
                    >
                      <LucideCopy className='w-3 h-3 text-muted-foreground' />
                    </button>
                  </div>
                </div>

                {/* Chain Status */}
                {showChainStatus && (
                  <div className='p-4 border-b border-white/10'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2'>Network</p>
                    <div className='flex items-center gap-2'>
                      <LucideCheck className='w-4 h-4 text-primary' />
                      <span className='text-sm text-primary'>World Chain</span>
                    </div>
                  </div>
                )}

                {/* Disconnect */}
                <div className='p-4'>
                  <Button
                    variant='ghost'
                    onClick={() => { setAddress(null); localStorage.removeItem('trucheq_wallet_auth'); setShowDropdown(false); }}
                    className='w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl'
                  >
                    Disconnect
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Click outside to close */}
        {showDropdown && (
          <div 
            className='fixed inset-0 z-40' 
            onClick={() => setShowDropdown(false)} 
          />
        )}
      </>
    );
  }

  // ---- Not connected ----
  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={cn(variantClasses[variant], sizeClasses[size], 'font-black rounded-xl', className)}
      >
        <LucideGlobe className={cn('w-4 h-4', size === 'lg' && 'w-5 h-5')} />
        {size === 'lg' ? 'Connect Wallet' : 'Connect'}
      </Button>

      {showModal && (
        <WorldConnectModal 
          onClose={() => setShowModal(false)} 
          onConnect={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface WorldConnectModalProps {
  onClose: () => void;
  onConnect: () => void;
}

function WorldConnectModal({ onClose, onConnect }: WorldConnectModalProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInsideWorldApp = MiniKit.isInstalled();

  const handleWalletAuth = async () => {
    if (!isInsideWorldApp || isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await walletAuth();
      localStorage.setItem('trucheq_wallet_auth', JSON.stringify(result));
      toast.success('Wallet authenticated!');
      onConnect();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      toast.error('Authentication failed', { description: errorMessage });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className='w-full max-w-md mx-4'
        onClick={e => e.stopPropagation()}
      >
        <Card className='border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden rounded-[2rem]'>
          <CardHeader className='text-center pb-2'>
            <div className='flex justify-center mb-4'>
              <div className='p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary'>
                <LucideGlobe className='w-10 h-10' />
              </div>
            </div>
            <Badge variant='outline' className='mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40'>
              World Native
            </Badge>
            <CardTitle className='text-2xl font-black italic tracking-tighter'>
              Connect Your Wallet
            </CardTitle>
          </CardHeader>

          <CardContent className='space-y-4 pt-4'>
            {/* World App Option — only available inside World App WebView */}
            {isInsideWorldApp && (
              <div className='space-y-3'>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center'>
                  Recommended
                </p>

                <Button
                  onClick={handleWalletAuth}
                  disabled={isAuthenticating}
                  className={cn(
                    'w-full py-6 rounded-2xl font-black text-lg',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'shadow-[0_16px_32px_rgba(0,214,50,0.25)]',
                    'transition-all active:scale-[0.98]',
                    isAuthenticating && 'opacity-50'
                  )}
                >
                  {isAuthenticating ? (
                    <>
                      <LucideLoader2 className='w-5 h-5 mr-3 animate-spin' />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LucideGlobe className='w-5 h-5 mr-3' />
                      World App
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className='p-3 rounded-xl bg-red-500/10 border border-red-500/20'>
                <p className='text-xs text-red-400 text-center'>{error}</p>
              </div>
            )}

            {/* Close */}
            <Button
              variant='ghost'
              onClick={onClose}
              className='w-full rounded-xl text-muted-foreground hover:text-white'
            >
              <LucideX className='w-4 h-4 mr-2' />
              Cancel
            </Button>

            <p className='text-center text-[10px] text-muted-foreground'>
              By connecting, you agree to pay for listings using your connected wallet
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}