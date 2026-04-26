'use client';

import React from 'react';
import { DealGate } from '@/components/DealGate';
import { Toaster } from '@/components/ui/sonner';
import { useIsMiniApp } from '@/lib/use-mini-app';
import Link from 'next/link';

export default function DealPageContent({ id, meta }: { id: string; meta?: string }) {
  const isMiniApp = useIsMiniApp();

  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

      {/* Mini App: World App provides native back/close — no custom header needed.
          Standalone: compact header matching AppShell style */}
      {!isMiniApp && (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                <img src="/trucheq-logo-sz.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
            </Link>
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
              ← Back
            </Link>
          </div>
        </header>
      )}

      {/* Main content — mobile-first max-w-lg matching AppShell */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
        <DealGate
          id={id}
          metadataUrl={meta}
        />
      </div>

      <Toaster position="bottom-center" theme="dark" richColors />
    </main>
  );
}
