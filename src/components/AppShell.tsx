'use client';

import React, { useState, useEffect } from 'react';

// ULTRA-MINIMAL TEST: No MiniKitProvider, no MiniKit imports.
// If this still jumps to Safari, the issue is 100% in the developer portal
// configuration (content_url domain mismatch or app_id issue).

export function AppShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0A0F14] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Hello World</h1>
      <p className="text-sm text-gray-400 mb-8">Ultra-minimal test — NO MiniKit</p>
      <p className="text-xs text-gray-500">If this still jumps: portal config issue</p>
    </div>
  );
}
