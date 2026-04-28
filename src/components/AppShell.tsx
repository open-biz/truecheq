'use client';

import React, { useState, useEffect } from 'react';

// STATIC HELLO WORLD TEST
// All other imports removed to isolate whether the Safari jump is caused by
// our code or by the World App portal configuration.
// Components kept on disk but not imported:
//   DealCreator, DealDashboard, ChatTab, MarketTab, TruCheqAuth, XMTPProvider

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Loading...');

  useEffect(() => {
    setMounted(true);
    // Minimal debug info — no external calls, no wallet auth, no storage writes
    try {
      const w = typeof window !== 'undefined' ? (window as any) : undefined;
      const info = {
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        hasWorldApp: !!w?.WorldApp,
        worldAppWallet: w?.WorldApp?.wallet_address?.slice(0, 8) + '...' || 'none',
      };
      setDebugInfo(JSON.stringify(info, null, 2));
    } catch {
      setDebugInfo('Error reading context');
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0A0F14] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Hello World</h1>
      <p className="text-sm text-gray-400 mb-8">Static test — no external calls</p>
      <pre className="bg-black/50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-w-full">
        {debugInfo}
      </pre>
    </div>
  );
}
