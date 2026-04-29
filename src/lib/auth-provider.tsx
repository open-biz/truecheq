'use client';

/**
 * AuthProvider — single source of truth for user authentication.
 *
 * Per World docs (https://docs.world.org/llms-full.txt):
 *  - walletAuth IS the login. World ID is for verification badges only.
 *  - "Do not use World ID verification as a login substitute."
 *  - Commands triggered on init MUST live in the same useEffect as
 *    MiniKit.install() to avoid race conditions.
 *
 * Behaviour:
 *  - Inside World App: install MiniKit → walletAuth → save user. One Approve.
 *  - Standalone browser: wagmi injected wallet connection = login.
 *    WagmiAuthSync (rendered inside WagmiProvider) watches useAccount() and
 *    syncs to AuthProvider context.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useAccount, useDisconnect } from 'wagmi';
import {
  type TruCheqUser,
  loadTruCheqUser,
  saveTruCheqUser,
  clearTruCheqUser,
  migrateToUnifiedUser,
  createTruCheqUser,
} from './trucheq-user';

interface AuthContextValue {
  user: TruCheqUser | null;
  isReady: boolean;          // true once initial restore + auto-auth attempt completes
  isAuthing: boolean;        // true while a walletAuth is in flight
  isMiniApp: boolean;        // MiniKit detected
  setUser: (u: TruCheqUser) => void;
  login: () => Promise<void>; // re-runs walletAuth (Mini App only)
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function newNonce(): string {
  return (
    crypto.randomUUID?.().replace(/-/g, '') || Date.now().toString(36).padStart(16, '0')
  ).slice(0, 16);
}

// ============================================================================
// WagmiAuthSync — watches wagmi account changes and syncs to AuthProvider
// MUST be rendered inside WagmiProvider (standalone browser only).
// ============================================================================

export function WagmiAuthSync() {
  const { user, setUser, logout } = useAuth();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Inside World App the worldApp() connector auto-handles auth; skip wagmi sync
  const insideWorldApp = typeof window !== 'undefined' && MiniKit.isInstalled();

  useEffect(() => {
    if (insideWorldApp) return;

    if (isConnected && address) {
      const existing = loadTruCheqUser();

      if (existing && existing.walletAddress.toLowerCase() === address.toLowerCase()) {
        // Same wallet — just ensure state is synced
        if (!user || user.walletAddress.toLowerCase() !== address.toLowerCase()) {
          setUser(existing);
        }
      } else {
        // New wallet connection — create user from wallet address
        const newUser = createTruCheqUser({
          walletAddress: address,
          nullifierHash: existing?.nullifierHash,
          isOrbVerified: existing?.isOrbVerified,
        });
        setUser(newUser);
      }
    } else if (!isConnected && user) {
      // Wallet disconnected — log out (logout() already calls clearTruCheqUser)
      disconnect();
      logout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  return null; // Renders nothing — just syncs state
}

// ============================================================================
// AuthProvider — core auth context
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<TruCheqUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthing, setIsAuthing] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  const initRanRef = useRef(false);

  const setUser = useCallback((u: TruCheqUser) => {
    setUserState(u);
    saveTruCheqUser(u);
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    clearTruCheqUser();
  }, []);

  // ----- INIT: install MiniKit + auto-walletAuth (Mini App only) -----
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    // 1) Restore any persisted user first
    const restored = loadTruCheqUser() || migrateToUnifiedUser();

    const insideWorldApp = MiniKit.isInstalled();
    setIsMiniApp(insideWorldApp);

    if (restored) setUserState(restored);

    if (!insideWorldApp) {
      // Standalone browser — WagmiAuthSync handles login
      setIsReady(true);
      return;
    }

    // 2) Install MiniKit (idempotent; required before commands)
    try {
      MiniKit.install();
      document.body.classList.add('is-mini-app');
    } catch (err) {
      console.warn('[Auth] MiniKit.install failed:', err);
    }

    // 3) If we already have a wallet address, we're done
    if (restored?.walletAddress) {
      setIsReady(true);
      return;
    }

    // 4) Otherwise, auto-walletAuth in the same effect (per docs FAQ)
    (async () => {
      setIsAuthing(true);
      try {
        const result = await MiniKit.walletAuth({
          nonce: newNonce(),
          statement: 'Sign in to TruCheq',
        });
        if (result.executedWith === 'fallback') return;

        const address = result.data.address;
        const merged = createTruCheqUser({
          walletAddress: address,
          nullifierHash: restored?.nullifierHash,
          isOrbVerified: restored?.isOrbVerified,
          sessionId: restored?.sessionId,
        });
        setUserState(merged);
        saveTruCheqUser(merged);
      } catch (err) {
        console.warn('[Auth] auto walletAuth failed:', err);
      } finally {
        setIsAuthing(false);
        setIsReady(true);
      }
    })();
  }, []);

  // ----- LOGIN (manual retry — Mini App only) -----
  const login = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('[Auth] login() called outside World App — use injected wallet instead');
      return;
    }
    if (isAuthing) return;
    setIsAuthing(true);
    try {
      const result = await MiniKit.walletAuth({
        nonce: newNonce(),
        statement: 'Sign in to TruCheq',
      });
      if (result.executedWith === 'fallback') return;

      const address = result.data.address;
      const next = createTruCheqUser({
        walletAddress: address,
        nullifierHash: user?.nullifierHash,
        isOrbVerified: user?.isOrbVerified,
        sessionId: user?.sessionId,
      });
      setUserState(next);
      saveTruCheqUser(next);
    } catch (err) {
      console.warn('[Auth] login() failed:', err);
    } finally {
      setIsAuthing(false);
    }
  }, [isAuthing, user]);

  return (
    <AuthContext.Provider
      value={{ user, isReady, isAuthing, isMiniApp, setUser, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
