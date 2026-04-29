'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Client, type Signer, IdentifierKind, ConsentState } from '@xmtp/browser-sdk';
import { MiniKit } from '@worldcoin/minikit-js';
import { getStoredWalletAddress, getWalletClient } from './wallet-client';
import { getXMTPEnv } from './xmtp';
import { STORAGE_KEYS } from './utils';

// ============================================================================
// Context
// ============================================================================

interface XMTPContextValue {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  initClient: () => Promise<void>;
  activateClient: () => void;
}

const XMTPContext = createContext<XMTPContextValue>({
  client: null,
  isLoading: false,
  error: null,
  initClient: async () => {},
  activateClient: () => {},
});

export function useXMTP(): XMTPContextValue {
  const ctx = useContext(XMTPContext);
  if (!ctx) {
    throw new Error('useXMTP must be used within an XMTPProvider');
  }
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

// localStorage key for lazy XMTP activation persistence (shared in STORAGE_KEYS)
const LAZY_KEY = STORAGE_KEYS.XMTP_ACTIVATED;

/**
 * Retrieve or generate a stable 32-byte DB encryption key per wallet address.
 * Persisting it means XMTP can reuse its local IndexedDB cache across page
 * loads — so Client.create() doesn't need to call signMessage() every session.
 */
function getOrCreateDbKey(address: string): Uint8Array {
  try {
    const storageKey = `xmtp_dbkey_${address.toLowerCase()}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const bytes = stored.match(/.{2}/g)?.map((b) => parseInt(b, 16));
      if (bytes && bytes.length === 32) return new Uint8Array(bytes);
    }
    const key = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(key).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, hex);
    return key;
  } catch {
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

export function XMTPProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const initializedWithRef = useRef<string | null>(null);

  const userAddress = getStoredWalletAddress();
  const isConnected = !!userAddress;

  // Hydration
  useEffect(() => {
    setIsHydrated(true);
    return () => { isMountedRef.current = false; };
  }, []);

  // Create XMTP signer (shared by all consumers)
  const getXmtpSigner = useCallback((): Signer | null => {
    if (!userAddress) return null;
    try {
      const signer: Signer = {
        type: 'EOA',
        getIdentifier: async () => ({
          identifier: userAddress.toLowerCase() as `0x${string}`,
          identifierKind: IdentifierKind.Ethereum,
        }),
        signMessage: async (message: string): Promise<Uint8Array> => {
          // Inside World App: use MiniKit.signMessage() — avoids triggering a
          // full wallet re-auth popup that the viem/provider path causes.
          if (MiniKit.isInstalled()) {
            const result = await MiniKit.signMessage({ message });
            if (result.executedWith === 'fallback') {
              throw new Error('Message signing cancelled or unavailable');
            }
            const hex = (result.data.signature as string).slice(2);
            return new Uint8Array(hex.match(/.{2}/g)?.map((b: string) => parseInt(b, 16)) || []);
          }
          // Standalone browser fallback: viem WalletClient
          const walletClient = getWalletClient();
          const signature = await walletClient.signMessage({
            message,
            account: userAddress.toLowerCase() as `0x${string}`,
          });
          const hex = signature.slice(2);
          return new Uint8Array(hex.match(/.{2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
        },
      };
      return signer;
    } catch {
      return null;
    }
  }, [userAddress]);

  // ============================================================================
  // Lazy init: only create Client after user visits Chat tab once
  // ============================================================================

  const hasActivatedRef = useRef(false);

  // Read persisted activation state on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(LAZY_KEY) === 'true') {
        hasActivatedRef.current = true;
      }
    } catch {
      // SSR or storage unavailable
    }
  }, []);

  // Track client via ref to avoid circular deps in useCallback
  const clientRef = useRef<Client | null>(null);

  // State version bump — when activateClient() sets the flag for the
  // first time, we bump this so the auto-init effect re-runs.
  const [activatedVersion, setActivatedVersion] = useState(0);

  // activateClient: called by ChatTab/XMTPChatInner on first use.
  // Just sets the flag + persists + bumps version — the auto-init
  // effect below calls initClient() on the next render cycle.
  // No direct initClient() call avoids double-init races and
  // unnecessary dep on initClient.
  const activateClient = useCallback(() => {
    if (!hasActivatedRef.current) {
      hasActivatedRef.current = true;
      try { localStorage.setItem(LAZY_KEY, 'true'); } catch {}
      setActivatedVersion(v => v + 1); // trigger auto-init effect
    }
  }, []);

  // Initialize XMTP client
  const initClient = useCallback(async () => {
    if (!isHydrated || !isConnected || !userAddress) return;

    // Skip if already initialized for this wallet
    if (hasInitializedRef.current && initializedWithRef.current === userAddress && clientRef.current) {
      return;
    }

    const signer = getXmtpSigner();
    if (!signer) {
      // signer is null when walletClient is unavailable — common after page refresh
      // when address is cached but the wallet provider hasn't reconnected yet.
      // Don't set a permanent error immediately: the effect will re-fire once
      // walletClient becomes available (getXmtpSigner → initClient identity changes).
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const dbEncryptionKey = getOrCreateDbKey(userAddress);
      const xmtpClient = await Client.create(signer, { env: getXMTPEnv(), dbEncryptionKey } as any);

      if (!isMountedRef.current) {
        xmtpClient.close();
        return;
      }

      // Sync conversations so they're ready for consumers
      await xmtpClient.conversations.syncAll([ConsentState.Allowed]);

      if (!isMountedRef.current) {
        xmtpClient.close();
        return;
      }

      clientRef.current = xmtpClient;
      setClient(xmtpClient);
      hasInitializedRef.current = true;
      initializedWithRef.current = userAddress;
    } catch (err) {
      console.error('[XMTPProvider] Init error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to connect to XMTP');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [isHydrated, isConnected, userAddress, getXmtpSigner]);

  // Auto-init on wallet connect / re-init on wallet change / init on first activation.
  // Only fires when hasActivatedRef.current is true (user has visited Chat tab once).
  useEffect(() => {
    if (isHydrated && isConnected && userAddress && hasActivatedRef.current) {
      // Wallet changed — reset and re-init
      if (initializedWithRef.current && initializedWithRef.current !== userAddress) {
        if (clientRef.current) {
          clientRef.current.close();
          clientRef.current = null;
          setClient(null);
        }
        hasInitializedRef.current = false;
      }

      // MiniKit wallet client is always available inside World App
      // initClient will silently return early when signer is null.
      initClient();
    }
    // activatedVersion ensures this re-runs when activateClient() fires
    // for the first time, even if wallet state hasn't changed.
  }, [isHydrated, isConnected, userAddress, initClient, activatedVersion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (clientRef.current) {
        clientRef.current.close();
      }
    };
  }, []);

  // Reset on wallet disconnect
  const prevConnectedRef = useRef(isConnected);
  useEffect(() => {
    // Only act on transition from connected → disconnected
    if (prevConnectedRef.current && !isConnected && clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
      setClient(null);
      hasInitializedRef.current = false;
      initializedWithRef.current = null;
      setError(null);
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  return (
    <XMTPContext.Provider value={{ client, isLoading, error, initClient, activateClient }}>
      {children}
    </XMTPContext.Provider>
  );
}
