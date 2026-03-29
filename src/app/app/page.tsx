'use client';

import React, { useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { DealCreator } from '@/components/DealCreator';
import { DealDashboard } from '@/components/DealDashboard';
import { WorldIDAuth, type WorldIDUser } from '@/components/WorldIDAuth';
import { WorldIDOnboarding } from '@/components/WorldIDOnboarding';
import { Button } from '@/components/ui/button';
import { LucidePlusCircle, LucideArrowLeft, LucideList, LucideShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function AppPage() {
  const [appSubView, setAppSubView] = useState<'create' | 'dashboard'>('create');
  const [worldUser, setWorldUser] = useState<WorldIDUser | null>(null);

  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

      {/* App Header */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <img src="/trucheq-logo-sz.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic">TruCheq</span>
          </Link>

          {worldUser && (
            <div className="flex items-center gap-1 md:gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              <Button
                variant={appSubView === 'create' ? 'secondary' : 'ghost'}
                onClick={() => setAppSubView('create')}
                className="rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest px-2 md:px-4"
              >
                <LucidePlusCircle className="md:mr-2 w-4 h-4" /> <span className="hidden sm:inline">Create</span>
              </Button>
              <Button
                variant={appSubView === 'dashboard' ? 'secondary' : 'ghost'}
                onClick={() => setAppSubView('dashboard')}
                className="rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest px-2 md:px-4"
              >
                <LucideList className="md:mr-2 w-4 h-4" /> <span className="hidden sm:inline">My Listings</span>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-4">
            {worldUser && (
              <Badge
                variant="outline"
                className={worldUser.isOrbVerified
                  ? 'border-primary/40 text-primary bg-primary/10 text-[10px] font-black uppercase tracking-widest'
                  : 'border-blue-500/40 text-blue-400 bg-blue-500/10 text-[10px] font-black uppercase tracking-widest'
                }
              >
                <LucideShieldCheck className="w-3 h-3 mr-1" />
                {worldUser.isOrbVerified ? 'Orb' : 'Device'}
              </Badge>
            )}
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                <LucideArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* App Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {!worldUser ? (
          <div className="flex flex-col items-center justify-center py-16 gap-8">
            <div className="max-w-md w-full">
              <WorldIDAuth onSuccess={setWorldUser} />
            </div>
            <div className="max-w-lg w-full">
              <WorldIDOnboarding />
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={appSubView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {appSubView === 'create'
                ? <DealCreator isOrbVerified={worldUser.isOrbVerified} />
                : <DealDashboard />
              }
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Toaster position="bottom-right" theme="dark" richColors />
    </main>
  );
}
