'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { Wallet, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { worldChain } from '@/lib/chains';

/**
 * ConnectButton — Connect/disconnect injected wallet using wagmi directly.
 * No RainbowKit/WalletConnect Cloud dependency — just MetaMask, Coinbase Wallet, etc.
 * Only rendered in standalone browser mode (not inside World App).
 *
 * @param variant - 'default' for full-width standalone use, 'compact' for header pill
 */
export function ConnectButton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, isError, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isError: isSwitchError } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== worldChain.id;
  const isCompact = variant === 'compact';

  // ---- Compact variants ----

  // Connected but wrong network — compact pill
  if (isWrongNetwork && address && isCompact) {
    return (
      <button
        onClick={() => switchChain({ chainId: worldChain.id })}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/80 text-white hover:bg-destructive transition-colors"
      >
        <ArrowRightLeft className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">Wrong Net</span>
      </button>
    );
  }

  // Connected — compact pill
  if (isConnected && address && isCompact) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,214,50,0.4)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  // Not connected — compact connect pill
  if (isCompact) {
    if (connectors.length === 0) {
      return (
        <a
          href="https://metamask.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary/70 hover:bg-primary/30 transition-colors"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">No Wallet</span>
        </a>
      );
    }

    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40"
      >
        <Wallet className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {isPending ? '...' : 'Connect'}
        </span>
      </button>
    );
  }

  // ---- Default (full-width) variants ----

  // Connected but on wrong network — prompt to switch
  if (isWrongNetwork && address) {
    return (
      <div className="w-full space-y-2">
        <button
          onClick={() => switchChain({ chainId: worldChain.id })}
          className="w-full h-14 rounded-2xl bg-destructive text-white font-black text-sm uppercase tracking-widest hover:bg-destructive/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-5 h-5" />
          Switch to World Chain
        </button>
        {isSwitchError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            <p className="text-xs text-destructive/80">
              {switchError?.message?.includes('rejected')
                ? 'Switch rejected — try again'
                : 'Failed to switch network — try manually in your wallet'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Connected — disconnect pill
  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,214,50,0.4)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  // No injected wallet detected — show helpful message
  if (connectors.length === 0) {
    return (
      <div className="w-full space-y-3">
        <button
          disabled
          className="w-full h-14 rounded-2xl bg-primary/40 text-primary-foreground font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
        <p className="text-xs text-white/30 text-center">
          No wallet detected — install <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary underline">MetaMask</a> or another browser wallet extension
        </p>
      </div>
    );
  }

  const connector = connectors[0];

  return (
    <div className="w-full space-y-2">
      <button
        onClick={() => connect({ connector })}
        disabled={isPending}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-[0_4px_24px_rgba(0,214,50,0.3)] hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Wallet className="w-5 h-5" />
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {isError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <p className="text-xs text-destructive/80">
            {error?.message?.includes('rejected')
              ? 'Connection rejected — try again'
              : error?.message?.includes('already pending')
              ? 'Connection already pending — check your wallet'
              : 'Connection failed — try again'}
          </p>
        </div>
      )}
    </div>
  );
}
