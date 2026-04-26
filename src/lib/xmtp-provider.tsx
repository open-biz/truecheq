'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Client, type Signer, IdentifierKind, ConsentState } from '@xmtp/browser-sdk';
import { useWalletClient, useAccount } from 'wagmi';

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
import { STORAGE_KEYS } from './utils';
const LAZY_KEY = STORAGE_KEYS.XMTP_ACTIVATED;
const WALLET_CLIENT_ERROR = 'Wallet client unavailable — please reconnect your wallet';

export function XMTPProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const initializedWithRef = useRef<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const { address: userAddress, isConnected } = useAccount();

  // Hydration
  useEffect(() => {
    setIsHydrated(true);
    return () => { isMountedRef.current = false; };
  }, []);

  // Create XMTP signer (shared by all consumers)
  const getXmtpSigner = useCallback((): Signer | null => {
    if (!walletClient || !userAddress) return null;
    try {
      const signer: Signer = {
        type: 'EOA',
        getIdentifier: async () => ({
          identifier: userAddress.toLowerCase() as `0x${string}`,
          identifierKind: IdentifierKind.Ethereum,
        }),
        signMessage: async (message: string): Promise<Uint8Array> => {
          const signature = await walletClient.signMessage({ message });
          const hex = signature.slice(2);
          return new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
        },
      };
      return signer;
    } catch {
      return null;
    }
  }, [walletClient, userAddress]);

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

      const xmtpClient = await Client.create(signer, { env: 'dev' } as any);

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

      // If walletClient is not ready yet, show a delayed error instead of
      // failing silently forever. initClient will silently return early when
      // signer is null, and this effect re-fires when walletClient arrives.
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (!walletClient) {
        timeoutId = setTimeout(() => {
          if (isMountedRef.current && !clientRef.current) {
            setError(WALLET_CLIENT_ERROR);
          }
        }, 5000);
      } else {
        // walletClient is available — clear any stale reconnect error
        setError(prev => prev === WALLET_CLIENT_ERROR ? null : prev);
      }

      initClient();
      return () => { if (timeoutId) clearTimeout(timeoutId); };
    }
    // activatedVersion ensures this re-runs when activateClient() fires
    // for the first time, even if wallet state hasn't changed.
  }, [isHydrated, isConnected, userAddress, walletClient, initClient, activatedVersion]);

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
