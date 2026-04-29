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
 *  - Standalone browser: no auto-auth. UI calls login() to trigger flow.
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
import {
  type TruCheqUser,
  loadTruCheqUser,
  saveTruCheqUser,
  clearTruCheqUser,
  migrateToUnifiedUser,
} from './trucheq-user';

interface AuthContextValue {
  user: TruCheqUser | null;
  isReady: boolean;          // true once initial restore + auto-auth attempt completes
  isAuthing: boolean;        // true while a walletAuth is in flight
  isMiniApp: boolean;        // MiniKit detected
  setUser: (u: TruCheqUser) => void;
  login: () => Promise<void>; // re-runs walletAuth (e.g. for chat or retry)
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function deriveTruCheqCode(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').slice(-6).toUpperCase();
}

function newNonce(): string {
  return (
    crypto.randomUUID?.().replace(/-/g, '') || Date.now().toString(36).padStart(16, '0')
  ).slice(0, 16);
}

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

  // ----- INIT: install MiniKit + auto-walletAuth in the SAME effect -----
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    // 1) Restore any persisted user first
    const restored = loadTruCheqUser() || migrateToUnifiedUser();

    const insideWorldApp = MiniKit.isInstalled();
    setIsMiniApp(insideWorldApp);

    if (restored) setUserState(restored);

    if (!insideWorldApp) {
      // Standalone browser — no auto-auth
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
        const merged: TruCheqUser = {
          nullifierHash: restored?.nullifierHash || '',
          isOrbVerified: restored?.isOrbVerified || false,
          verificationLevel: restored?.verificationLevel || 'device',
          walletAddress: address,
          truCheqCode: restored?.truCheqCode || deriveTruCheqCode(address),
          sessionId: restored?.sessionId,
          createdAt: restored?.createdAt || Date.now(),
        };
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

  // ----- LOGIN (manual retry / "connect wallet" CTA) -----
  const login = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('[Auth] login() called outside World App');
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
      const next: TruCheqUser = {
        nullifierHash: user?.nullifierHash || '',
        isOrbVerified: user?.isOrbVerified || false,
        verificationLevel: user?.verificationLevel || 'device',
        walletAddress: address,
        truCheqCode: user?.truCheqCode || deriveTruCheqCode(address),
        sessionId: user?.sessionId,
        createdAt: user?.createdAt || Date.now(),
      };
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
