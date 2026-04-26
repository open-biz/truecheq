'use client';

import React, { useState, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LucideWallet, 
  LucideCheck, 
  LucideX, 
  LucideLoader2, 
  LucideExternalLink,
  LucideGlobe,
  LucideChevronDown,
  LucideLogOut,
  LucideCopy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniKit } from '@worldcoin/minikit-js';
import { toast } from 'sonner';

import { worldChain, worldChainSepolia } from '@/lib/chains';

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
  // Base
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
  
  // Wagmi wallet connection
  const { address, isConnected, chain, connector } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  const isCorrectChain = chain?.id === WORLD_CHAIN_ID || chain?.id === WORLD_CHAIN_SEPOLIA_ID;
  
  // Check if connected via World App deep link
  const isWorldApp = connector?.id === 'worldApp' || connector?.name.toLowerCase().includes('world');

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
  if (isConnected && address) {
    return (
      <>
        <div className={cn('relative', className)}>
          <Button
            variant='ghost'
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              'flex items-center gap-2 font-mono bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl',
              sizeClasses[size],
              isCorrectChain ? 'text-primary' : 'text-yellow-400'
            )}
          >
            {showChainStatus && (
              <div className={cn(
                'w-2 h-2 rounded-full',
                isCorrectChain ? 'bg-primary' : 'bg-yellow-400'
              )} />
            )}
            {isWorldApp && <span>🌍</span>}
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
                {isWorldApp && (
                  <div className='p-4 border-b border-white/10'>
                    <Badge variant='outline' className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40'>
                      🌏 World App
                    </Badge>
                  </div>
                )}

                {/* Address */}
                <div className='p-4 border-b border-white/10'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2'>
                    {isWorldApp ? 'World App Wallet' : 'Connected Wallet'}
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
                      {isCorrectChain ? (
                        <>
                          <LucideCheck className='w-4 h-4 text-primary' />
                          <span className='text-sm text-primary'>World Chain</span>
                        </>
                      ) : (
                        <>
                          <LucideGlobe className='w-4 h-4 text-yellow-400' />
                          <span className='text-sm text-yellow-400'>Wrong Network</span>
                        </>
                      )}
                    </div>
                    {!isCorrectChain && (
                      <Button
                        size='sm'
                        onClick={() => switchChain({ chainId: WORLD_CHAIN_ID })}
                        className='mt-2 w-full bg-yellow-500 text-black hover:bg-yellow-400 rounded-xl text-xs font-black'
                      >
                        Switch to World Chain
                      </Button>
                    )}
                  </div>
                )}

                {/* Explorer Link */}
                {chain && (
                  <div className='p-4 border-b border-white/10'>
                    <a 
                      href={`${getExplorerUrl(chain.id)}/address/${address}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors'
                    >
                      View on Explorer
                      <LucideExternalLink className='w-3 h-3' />
                    </a>
                  </div>
                )}

                {/* Disconnect */}
                <div className='p-4'>
                  <Button
                    variant='ghost'
                    onClick={() => { disconnect(); setShowDropdown(false); }}
                    className='w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl'
                  >
                    <LucideLogOut className='w-4 h-4 mr-2' />
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
  const { connectors, connect, isPending, error } = useConnect();
  
  const handleConnect = useCallback((connector: typeof connectors[0]) => {
    connect({ connector }, {
      onSuccess: () => {
        toast.success('Wallet connected!');
        onConnect();
      },
      onError: (err) => {
        toast.error('Connection failed', { description: err.message });
      }
    });
  }, [connect, onConnect]);

  const isInsideWorldApp = MiniKit.isInstalled();

  // worldApp() connector only works inside World App WebView (requires window.WorldApp)
  const worldAppConnector = isInsideWorldApp
    ? connectors.find(c => c.id === 'worldApp')
    : null;

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
            {worldAppConnector && (
              <div className='space-y-3'>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center'>
                  Recommended
                </p>
                
                <Button
                  onClick={() => handleConnect(worldAppConnector)}
                  disabled={isPending}
                  className={cn(
                    'w-full py-6 rounded-2xl font-black text-lg',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'shadow-[0_16px_32px_rgba(0,214,50,0.25)]',
                    'transition-all active:scale-[0.98]',
                    isPending && 'opacity-50'
                  )}
                >
                  {isPending ? (
                    <>
                      <LucideLoader2 className='w-5 h-5 mr-3 animate-spin' />
                      Opening World App...
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

            {/* Other wallets (injected — MetaMask, Rabby, etc.) */}
            {connectors.filter(c => c.id !== 'worldApp').length > 0 && (
              <>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-white/10' />
                  </div>
                  <div className='relative flex justify-center'>
                    <span className='bg-black px-3 text-[10px] uppercase tracking-widest text-muted-foreground'>
                      or
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  {connectors
                    .filter(c => c.id !== 'worldApp')
                    .map((connector) => (
                      <Button
                        key={connector.id}
                        onClick={() => handleConnect(connector)}
                        variant='secondary'
                        className='w-full py-4 rounded-xl font-black text-sm bg-white/5 border-white/10 hover:bg-white/10'
                      >
                        <LucideWallet className='w-4 h-4 mr-2' />
                        {connector.name}
                      </Button>
                    ))}
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className='p-3 rounded-xl bg-red-500/10 border border-red-500/20'>
                <p className='text-xs text-red-400 text-center'>{error.message}</p>
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