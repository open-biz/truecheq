'use client';

import React from 'react';
import { DealGate } from '@/components/DealGate';
import { Toaster } from "@/components/ui/sonner";
import { Button } from '@/components/ui/button';
import { LucideArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ meta?: string }> }) {
  const resolvedParams = React.use(params);
  const resolvedSearchParams = React.use(searchParams);

  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src="/trucheq-logo-sz.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic">TruCheq</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="rounded-xl hover:bg-white/5 font-black text-xs uppercase tracking-widest">
                <LucideArrowLeft className="mr-2 w-4 h-4" /> Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <DealGate
          id={resolvedParams.id}
          metadataUrl={resolvedSearchParams.meta ? decodeURIComponent(resolvedSearchParams.meta) : undefined}
        />
      </div>

      <Toaster position="bottom-right" theme="dark" richColors />
    </main>
  );
}
