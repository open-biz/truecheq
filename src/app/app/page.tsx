'use client';

import React, { useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { DealCreator } from '@/components/DealCreator';
import { DealGate } from '@/components/DealGate';
import { Button } from '@/components/ui/button';
import { LucideLayoutDashboard, LucidePlusCircle, LucideGlobe, LucideArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function AppPage() {
  const { isConnected } = useAccount();
  const [appSubView, setAppSubView] = useState<'create' | 'browse'>('create');

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

            <div className="hidden md:flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                <Button 
                    variant={appSubView === 'create' ? 'secondary' : 'ghost'} 
                    onClick={() => setAppSubView('create')}
                    className="rounded-xl font-black text-xs uppercase tracking-widest"
                >
                    <LucidePlusCircle className="mr-2 w-4 h-4" /> Create
                </Button>
                <Button 
                    variant={appSubView === 'browse' ? 'secondary' : 'ghost'} 
                    onClick={() => setAppSubView('browse')}
                    className="rounded-xl font-black text-xs uppercase tracking-widest"
                >
                    <LucideLayoutDashboard className="mr-2 w-4 h-4" /> Demo Deal
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                        <LucideArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <ConnectButton label="Connect Wallet" />
            </div>
        </div>
      </nav>

      {/* App Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
                    <LucidePlusCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-4xl font-black mb-4 tracking-tight">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-10 max-w-sm font-bold">Connect your Crypto.com DeFi Wallet to start using the TruCheq settlement layer.</p>
                <ConnectButton />
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
                    {appSubView === 'create' ? <DealCreator /> : <DealGate id={0} />}
                </motion.div>
            </AnimatePresence>
        )}
      </div>

      <Toaster position="bottom-right" theme="dark" richColors />
    </main>
  );
}
