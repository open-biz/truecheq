'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';
import { MiniKit } from '@worldcoin/minikit-js';
import { config } from '@/lib/wagmi';
import { XMTPProvider } from '@/lib/xmtp-provider';

// MiniKit requires a valid app_id (format: app_xxx) from developer.world.org.
// Fail loudly at runtime if missing — the TypeScript `!` assertion only hides the type error.
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || process.env.NEXT_PUBLIC_WLD_APP_ID;
if (!APP_ID) throw new Error('NEXT_PUBLIC_APP_ID is required — get it from https://developer.world.org');
const REQUIRED_APP_ID = APP_ID as `app_${string}`;

type MiniKitDiagnostics = {
  appId: string;
  isInstalled: boolean;
  isInWorldApp: boolean;
  hasWorldAppBridge: boolean;
  hasMiniKitBridge: boolean;
  href: string;
  queryAppId: string | null;
  queryPath: string | null;
  queryOpenOutOfWindow: string | null;
  userAgent: string;
  worldJsonAppId?: string | null;
  worldJsonUrl?: string | null;
  appIdMatchesWorldJson?: boolean;
  queryAppIdMatchesEnv?: boolean;
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // When running inside World App, add a CSS class to the body so we can scope
  // Mini App-specific styles (e.g. bottom safe zone) without affecting standalone.
  // Also log MiniKit init status for debugging.
  useEffect(() => {
    const worldAppBridge = (window as unknown as { WorldApp?: unknown }).WorldApp;
    const miniKitBridge = (window as unknown as { MiniKit?: unknown }).MiniKit;
    const params = new URLSearchParams(window.location.search);
    const diag: MiniKitDiagnostics = {
      appId: REQUIRED_APP_ID,
      isInstalled: MiniKit.isInstalled(true),
      isInWorldApp: MiniKit.isInWorldApp(),
      hasWorldAppBridge: Boolean(worldAppBridge),
      hasMiniKitBridge: Boolean(miniKitBridge),
      href: window.location.href,
      queryAppId: params.get('app_id'),
      queryPath: params.get('path'),
      queryOpenOutOfWindow: params.get('open_out_of_window'),
      userAgent: navigator.userAgent,
    };

    // Make diagnostics easy to inspect from mobile remote debugger.
    (window as unknown as { __TRUCHEQ_MINIKIT_DIAG__?: MiniKitDiagnostics }).__TRUCHEQ_MINIKIT_DIAG__ = diag;

    console.group('[MiniKit] Startup diagnostics');
    console.log(diag);
    console.log('[MiniKit] user:', MiniKit.user);
    console.log('[MiniKit] deviceProperties:', MiniKit.deviceProperties);
    console.log('[MiniKit] location:', MiniKit.location);
    if (diag.queryOpenOutOfWindow) {
      console.warn('[MiniKit] open_out_of_window detected:', diag.queryOpenOutOfWindow);
    }
    if (diag.queryAppId && diag.queryAppId !== APP_ID) {
      console.warn('[MiniKit] URL app_id differs from configured appId', {
        queryAppId: diag.queryAppId,
        configuredAppId: APP_ID,
      });
    }
    console.groupEnd();

    // Best-effort check for app_id drift against deployed world.json.
    fetch('/.well-known/world.json')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((json: { app_id?: string; url?: string } | null) => {
        const worldJsonAppId = json?.app_id ?? null;
        const worldJsonUrl = json?.url ?? null;
        const extendedDiag = {
          ...diag,
          worldJsonAppId,
          worldJsonUrl,
          appIdMatchesWorldJson: worldJsonAppId ? worldJsonAppId === APP_ID : undefined,
          queryAppIdMatchesEnv: diag.queryAppId ? diag.queryAppId === APP_ID : undefined,
        };
        (window as unknown as { __TRUCHEQ_MINIKIT_DIAG__?: MiniKitDiagnostics }).__TRUCHEQ_MINIKIT_DIAG__ = extendedDiag;
        console.log('[MiniKit] world.json check:', {
          worldJsonAppId,
          worldJsonUrl,
          appIdMatchesConfigured: worldJsonAppId ? worldJsonAppId === APP_ID : 'unknown',
        });
      })
      .catch((err) => {
        console.warn('[MiniKit] failed to read /.well-known/world.json', err);
      });

    if (diag.isInstalled) {
      document.body.classList.add('is-mini-app');
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          props={{
            appId: REQUIRED_APP_ID,
            wagmiConfig: config,
          }}
        >
          <XMTPProvider>
            {children}
          </XMTPProvider>
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}