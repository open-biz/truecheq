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
    const stored = localStorage.getItem('trucheq_wallet_auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.address || null;
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
