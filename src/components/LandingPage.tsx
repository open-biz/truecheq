"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LucideArrowRight,
  LucideShieldCheck,
  LucideMessageCircle,
  LucideUsers,
  LucideLock,
  LucideUnlock,
  LucideArrowUpRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import Link from 'next/link';
import {
  RetroGrid,
  Marquee,
  TruCheqCoin,
  Spotlight,
} from "@/components/ui/code-graphics";

export default function LandingPage() {
  const [isLocked, setIsLocked] = useState(true);
  const [verifications, setVerifications] = useState<{ id: number; addr: string; level: string }[]>([]);

  useEffect(() => {
    const items = Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      addr: Math.random().toString(16).slice(2, 6).toUpperCase(),
      level: Math.random() > 0.4 ? 'Orb' : 'Device',
    }));
    setVerifications(items);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:m-4">
        Skip to main content
      </a>
      <Spotlight />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06]" role="navigation" aria-label="Main navigation">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(0,214,50,0.1)]">
              <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
          </div>
          <Link href="/">
            <Button className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl h-9 px-4 shadow-[0_0_12px_rgba(0,214,50,0.25)] hover:shadow-[0_0_20px_rgba(0,214,50,0.4)] transition-all">
              Launch App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="main-content" className="relative min-h-[52vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <RetroGrid className="opacity-30" />
        <div className="relative z-10 max-w-lg mx-auto w-full py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="outline" className="mb-5 border-primary/40 text-primary bg-primary/5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              🌐 World Chain × XMTP × Hackathon
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-[0.95] text-white"
          >
            Headless{' '}
            <span className="text-primary italic">Commerce</span>
            <br />for the Agent Era.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base text-white/50 mb-8 leading-relaxed font-medium"
          >
            Sybil-resistant P2P marketplace. World&nbsp;ID verifies sellers, XMTP encrypts chat, World Pay settles &mdash; no database needed.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Link href="/" className="block w-full">
              <Button size="lg" className="w-full h-14 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_4px_24px_rgba(0,214,50,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                Open Marketplace <LucideArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="max-w-lg mx-auto px-6 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['0% Fees', 'Orb Verified', 'No Database', 'XMTP Encrypted'].map((stat) => (
            <span key={stat} className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/[0.06] rounded-full px-3 py-1.5">
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Bento Grid */}
      <section id="features" className="px-6 pb-10 max-w-lg mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">Features</h2>
          <p className="text-sm text-white/40 font-bold mt-0.5">Protocol-level trust for P2P trade.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 auto-rows-auto">

          {/* World ID — full width */}
          <div className="col-span-2 bg-card rounded-2xl border border-white/[0.06] overflow-hidden relative group p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <LucideShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">World ID</h3>
                  <p className="text-xs text-white/40 font-bold">Sybil-resistant identity</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                <span className={cn('text-[9px] font-black tracking-widest transition-colors', isLocked ? 'text-red-400' : 'text-primary')}>
                  {isLocked ? 'UNVERIFIED' : 'ORB ✓'}
                </span>
                <Switch checked={!isLocked} onCheckedChange={(v) => setIsLocked(!v)} />
              </div>
            </div>
            <div className="relative z-10 p-5 rounded-xl bg-black/50 flex items-center gap-6">
              <TruCheqCoin active={!isLocked} />
              <div className="flex-1 space-y-3">
                <div className={`h-2 rounded-full transition-all duration-700 ${isLocked ? 'w-1/3 bg-white/10' : 'w-full bg-primary/40 shadow-[0_0_8px_rgba(0,214,50,0.3)]'}`} />
                <div className={`h-2 rounded-full transition-all duration-700 ${isLocked ? 'w-2/3 bg-white/5' : 'w-3/4 bg-primary/20'}`} />
              </div>
              <div className={cn('p-2.5 rounded-xl transition-all duration-700', isLocked ? 'bg-white/5 text-white/10' : 'bg-primary/20 text-primary')}>
                <LucideUnlock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* XMTP Chat — full width, fixed height */}
          <div className="col-span-2 bg-card rounded-2xl border border-white/[0.06] overflow-hidden relative flex flex-col" style={{ height: 220 }}>
            <div className="p-5 pb-3 relative z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <LucideMessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">XMTP Chat</h3>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">End-to-end encrypted</p>
                </div>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card to-transparent z-10" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent z-10" />
              <Marquee vertical repeat={8} className="[--duration:20s] h-full">
                {verifications.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 py-2 px-5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=v-${v.id}`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">0x...{v.addr}</p>
                      <p className={`text-[10px] font-black ${v.level === 'Orb' ? 'text-primary' : 'text-blue-400'}`}>
                        {v.level === 'Orb' ? '✅ Orb' : '📱 Device'}
                      </p>
                    </div>
                    <LucideArrowUpRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  </div>
                ))}
              </Marquee>
            </div>
          </div>

          {/* World Pay — half width */}
          <div className="bg-card rounded-2xl border border-white/[0.06] p-5 flex flex-col justify-between min-h-[160px]">
            <div>
              <LucideLock className="w-5 h-5 text-primary mb-3" />
              <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">World Pay</h3>
              <p className="text-xs text-white/40 font-bold leading-snug">Native payments in World App.</p>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="p-2 rounded-xl bg-black/60">
                <div className="w-8 h-8 bg-blue-500 flex items-center justify-center rounded-lg text-white font-bold text-sm">₿</div>
              </div>
              <div className="flex-1 mx-2 h-px bg-gradient-to-r from-blue-500/30 via-primary/50 to-primary/30" />
              <div className="p-2 rounded-xl bg-black/60 shadow-[0_0_12px_rgba(0,214,50,0.15)]">
                <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-lg text-black font-black italic text-sm">T</div>
              </div>
            </div>
          </div>

          {/* Zero Fees — half width */}
          <div className="bg-card rounded-2xl border border-white/[0.06] p-5 flex flex-col justify-between min-h-[160px]">
            <div>
              <LucideUsers className="w-5 h-5 text-primary mb-3" />
              <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Zero Fees</h3>
              <p className="text-xs text-white/40 font-bold leading-snug">The software is the service.</p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
                  <span>Legacy</span><span>15%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-red-400/40" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-primary">
                  <span>TruCheq</span><span>0%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: '3%' }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-primary shadow-[0_0_8px_rgba(0,214,50,0.5)]" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Use Cases — native swipe */}
      <section id="cases" className="pb-10">
        <div className="max-w-lg mx-auto px-6 mb-4">
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">Use Cases</h2>
          <p className="text-sm text-white/40 font-bold mt-0.5">The trust layer for social commerce.</p>
        </div>
        <div className="flex gap-3 overflow-x-auto px-6 pb-3 snap-x snap-mandatory scrollbar-none">
          {[
            { title: "r/Watchexchange", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", text: "Verified sellers with World ID before shipping high-value watches." },
            { title: "Concert Tickets", img: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop", text: "End ticket scams with sybil-resistant seller verification." },
            { title: "Hardware Swap", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=800&auto=format&fit=crop", text: "Negotiate via XMTP, pay with World Pay. Zero chargeback risk." },
            { title: "Sneaker Drops", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop", text: "AI agents help sellers manage listings at scale." },
          ].map((item) => (
            <div key={item.title} className="w-[260px] shrink-0 snap-start rounded-2xl overflow-hidden relative group" style={{ height: 320 }}>
              <img src={item.img} alt={item.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="inline-block text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-lg px-2 py-1 mb-2">{item.title}</span>
                <p className="text-white text-sm font-black leading-snug">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 pt-10 pb-16 border-t border-white/[0.06] relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(0,214,50,0.1)]">
            <img src="/trucheq-logo.jpeg" alt="TruCheq" className="object-cover w-full h-full" />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-white uppercase">Ready to Trade?</h3>
          <Link href="/" className="w-full">
            <Button size="lg" className="w-full h-14 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_4px_24px_rgba(0,214,50,0.3)] transition-all active:scale-95">
              Launch App
            </Button>
          </Link>
          <p className="text-xs text-white/25 font-black tracking-[0.15em] uppercase">Built for World Chain × XMTP × Coinbase Hackathon</p>
          <p className="text-xs text-white/15">© 2025 TruCheq Protocol</p>
        </div>
      </footer>
    </div>
  );
}
