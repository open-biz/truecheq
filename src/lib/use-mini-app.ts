'use client';

import { useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

/**
 * Detect if the app is running inside World App as a Mini App.
 * 
 * Uses MiniKit.isInstalled() synchronously as the initial state value
 * to prevent the standalone header from flashing on mount.
 * 
 * When inside World App:
 * - No custom header needed (World App provides native back/close)
 * - MiniKit commands available (walletAuth, sendTransaction, pay)
 * - Wallet auto-connected via World App
 * - Bottom tabs for navigation (no top nav)
 * 
 * When standalone browser:
 * - Custom sticky header with identity + wallet
 * - IDKit widget for World ID verification
 * - Manual wallet connect via WorldWalletButton
 * - Same bottom tabs
 */
export function useIsMiniApp(): boolean {
  // MiniKit.isInstalled() is synchronous — use it as initial state
  // to avoid the standalone header flashing before the effect runs
  const [isMiniApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return MiniKit.isInstalled();
  });

  return isMiniApp;
}
