'use client';

import { MiniKit, getWorldAppProvider } from '@worldcoin/minikit-js';
import { createWalletClient, custom } from 'viem';
import { worldChain } from './chains';

/**
 * Get the authenticated wallet address from stored MiniKit auth result.
 * Returns null if not authenticated.
 */
export function getStoredWalletAddress(): string | null {
  try {
    // Primary: read from the unified user object (trucheq_user)
    const userStored = localStorage.getItem('trucheq_user');
    if (userStored) {
      const user = JSON.parse(userStored);
      if (user.walletAddress) return user.walletAddress;
    }
    // MiniKit live state: available after walletAuth without re-prompting
    if (typeof window !== 'undefined' && MiniKit.isInstalled()) {
      const mkAddr = (MiniKit as any).user?.walletAddress;
      if (mkAddr) return mkAddr;
    }
    // Legacy fallback: old trucheq_wallet_auth key (never written in current flow,
    // but kept for backward compat with any persisted data)
    const legacy = localStorage.getItem('trucheq_wallet_auth');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed.address) return parsed.address;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated in the mini app.
 */
export function isWalletAuthenticated(): boolean {
  return !!getStoredWalletAddress();
}

/**
 * Creates a viem wallet client for mini-app using getWorldAppProvider.
 * 
 * Per the docs: Use getWorldAppProvider() inside World App.
 * This maps:
 * - eth_requestAccounts → MiniKit.walletAuth()
 * - eth_sendTransaction → MiniKit.sendTransaction()
 * - eth_chainId → 0x1e0 (World Chain 480)
 */
export function getWalletClient() {
  // Only works inside World App
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit is not installed. This app only works inside World App.');
  }

  const provider = getWorldAppProvider();

  return createWalletClient({
    chain: worldChain,
    transport: custom(provider),
  });
}

/**
 * Gets the provider directly for lower-level operations.
 */
export function getProvider() {
  if (!MiniKit.isInstalled()) {
    throw new Error('MiniKit is not installed. This app only works inside World App.');
  }

  return getWorldAppProvider();
}
