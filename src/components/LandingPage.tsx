"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LucideArrowRight, 
  LucidePlayCircle, 
  LucideShieldCheck, 
  LucideZap, 
  LucideUsers, 
  LucideLock, 
  LucideUnlock, 
  LucidePackage, 
  LucideArrowUpRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { 
  RetroGrid, 
  Marquee, 
  TruCheqCoin, 
  Spotlight,
  BorderBeam
} from "@/components/ui/code-graphics";

export default function LandingPage() {
  const [isLocked, setIsLocked] = React.useState(true);
  const [pledging, setPledging] = React.useState(false);
  const [demoActive, setDemoActive] = React.useState(false);
  const [transactions, setTransactions] = useState<{ id: number; addr: string; amount: number }[]>([]);

  useEffect(() => {
    const txs = Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      addr: Math.random().toString(16).slice(2, 6).toUpperCase(),
      amount: Math.floor(Math.random() * 1000 + 100)
    }));
    setTransactions(txs);
  }, []);

  const handlePledge = () => {
    setPledging(true);
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00D632", "#FFFFFF", "#10B981"],
      });
      toast.success("Transaction Signed via Crypto.com Wallet", {
        description: "500 CRO has been pledged and locked in escrow.",
      });
      setPledging(false);
      setDemoActive(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:m-4">
        Skip to main content
      </a>
      <Spotlight />
      
      {/* Sticky Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
              <img src="/trucheq-logo-sz.jpeg" alt="TruCheq Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic text-white">TruCheq</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black rounded-lg px-2 py-1">Features</a>
            <Link href="/app" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black rounded-lg px-2 py-1">Live Demo</Link>
            <a href="#cases" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black rounded-lg px-2 py-1">Use Cases</a>
          </div>

          <Link href="/app">
            <Button className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-4 shadow-[0_0_15px_rgba(0,214,50,0.3)] hover:shadow-[0_0_20px_rgba(0,214,50,0.5)] transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black" aria-label="Launch TruCheq application">
              Launch App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="main-content" className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center pt-20" role="banner" aria-label="Hero section">
        <RetroGrid className="opacity-40" />
        
        <div className="relative z-10 max-w-5xl mx-auto py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary bg-primary/5 backdrop-blur-sm px-4 py-1.5 rounded-full font-bold">
              🏆 Built for the Cronos Hackathon
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-6xl md:text-[5.5rem] font-black tracking-tight mb-8 leading-[0.95] text-white"
          >
            The Missing <span className="text-primary italic">'Buy Now'</span> <br className="hidden md:block" /> Button for Your DMs.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            TruCheq turns any chat thread into a secure point-of-sale with x402 settlement logic on Cronos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <div className="relative group w-full sm:w-auto">
              <BorderBeam size={80} duration={4} borderWidth={2} />
              <Link href="/app" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:px-10 py-8 text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-2xl shadow-[0_0_20px_rgba(0,214,50,0.2)] focus:outline-none focus:ring-4 focus:ring-primary/50" aria-label="Create a new TruCheq deal">
                    Create TruCheq <LucideArrowRight className="ml-2 w-6 h-6" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <Link href="/app" className="w-full sm:w-auto">
                <Button size="lg" variant="ghost" className="w-full sm:px-10 py-8 text-xl font-bold hover:bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm text-white focus:outline-none focus:ring-4 focus:ring-primary/50" aria-label="View demo of TruCheq">
                    View Demo <LucidePlayCircle className="ml-2 w-6 h-6" aria-hidden="true" />
                </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid (Features) */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative" role="region" aria-labelledby="features-heading">
        <div className="text-center mb-20">
            <h2 id="features-heading" className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white uppercase">Features</h2>
            <p className="text-xl text-muted-foreground font-bold">Protocol-level trust for peer-to-peer trade.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Box 1 (Large) - The x402 Lock */}
          <Card className="md:col-span-2 md:row-span-2 relative overflow-hidden group border-white/5 bg-card/50 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                 <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                    <LucideLock className="w-8 h-8" />
                 </div>
                 <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full transition-colors ${isLocked ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                        {isLocked ? "X402 LOCKED" : "200 OPEN"}
                    </span>
                    <Switch checked={!isLocked} onCheckedChange={(v) => setIsLocked(!v)} />
                 </div>
              </div>
              <div>
                <CardTitle className="text-4xl font-black mb-3 tracking-tight text-white uppercase">The x402 Protocol</CardTitle>
                <CardDescription className="text-lg max-w-md leading-relaxed text-foreground/70 font-bold">
                    Smart-contract gates that secure the "Mexican Standoff" of P2P trade. 
                    Identity is provable, funds are provable.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-full pt-0">
                <div className="w-full max-w-sm p-8 rounded-[2rem] border border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <TruCheqCoin active={!isLocked} />
                    <div className="flex-1 space-y-4">
                        <div className={`h-2.5 rounded-full transition-all duration-700 ${isLocked ? 'w-1/3 bg-white/10' : 'w-full bg-primary/30 shadow-[0_0_10px_rgba(0,214,50,0.3)]'}`} />
                        <div className={`h-2.5 rounded-full transition-all duration-700 ${isLocked ? 'w-2/3 bg-white/5' : 'w-3/4 bg-primary/20'}`} />
                    </div>
                    <div className={cn(
                        "p-3 rounded-xl transition-all duration-700",
                        isLocked ? "bg-white/5 text-white/10" : "bg-primary/20 text-primary"
                    )}>
                        <LucideUnlock className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Box 2 (Tall) - Settlement Stream */}
          <Card className="md:row-span-3 border-white/5 bg-card/50 backdrop-blur-xl relative overflow-hidden flex flex-col">
            <CardHeader className="relative z-10 bg-gradient-to-b from-card to-transparent pb-6">
              <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-6">
                <LucideZap className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-white uppercase">Live Settlement</CardTitle>
              <CardDescription className="text-sm font-bold text-foreground/50">
                CRONOS EVM • SUB-CENT FEES
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-card to-transparent z-10" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent z-10" />
              
              <Marquee vertical repeat={10} className="[--duration:25s] h-full">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 p-4 mx-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm hover:border-primary/20 transition-all group/tx cursor-default">
                    <Avatar className="w-10 h-10 border-2 border-white/5 group-hover/tx:border-primary/50 transition-all">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=tx-${tx.id}`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden text-left">
                      <p className="text-sm font-black truncate tracking-tight text-white">0x...{tx.addr}</p>
                      <p className="text-xs text-primary font-black">{tx.amount} CRO</p>
                    </div>
                    <LucideArrowUpRight className="w-4 h-4 text-white/20 group-hover/tx:text-primary transition-colors" />
                  </div>
                ))}
              </Marquee>
            </CardContent>
          </Card>

          {/* Box 3 (Small) - Trust Anchor */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2">
               <LucideShieldCheck className="w-6 h-6 text-primary mb-2" />
               <CardTitle className="text-xl font-black tracking-tight text-white uppercase">Trust Anchor</CardTitle>
               <CardDescription className="text-sm text-foreground/60 leading-snug font-bold">
                Crypto.com DeFi Wallet Bridge.
               </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
               <div className="flex items-center justify-between px-6 relative h-20">
                  <div className="z-10 p-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-xl transition-transform hover:scale-110">
                     <img src="https://crypto.com/static/06000c0f8623631f4a9b561c20141b71/6a798/defi-wallet.png" alt="CDC" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="z-10 p-3 rounded-2xl bg-black/60 border border-primary/20 backdrop-blur-md shadow-[0_0_20px_rgba(0,214,50,0.2)] transition-transform hover:scale-110">
                     <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl text-primary-foreground font-bold italic shadow-lg">T</div>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Box 4 (Small) - Zero Fees */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
            <CardHeader className="pb-2">
               <LucideUsers className="w-6 h-6 text-primary mb-2" />
               <CardTitle className="text-xl font-black tracking-tight text-white uppercase">Zero Sale Fees</CardTitle>
               <CardDescription className="text-sm text-foreground/60 leading-snug font-bold">
                The software is the service.
               </CardDescription>
            </CardHeader>
            <CardContent className="mt-2 text-left">
               <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        <span>Legacy</span>
                        <span>15%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-destructive/40" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                        <span>TruCheq</span>
                        <span>0%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: "3%" }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-primary shadow-[0_0_10px_rgba(0,214,50,0.5)]" />
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Demo (Live Demo) */}
      <section id="demo" className="py-24 px-6 bg-black/20 relative" role="region" aria-labelledby="demo-heading">
        <RetroGrid className="opacity-20" />
        <div className="max-w-4xl mx-auto text-center mb-16 relative z-10">
            <h2 id="demo-heading" className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-white uppercase">Live Demo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-bold">Experience the frictionless x402 settlement flow. Trust is hard-coded into the link.</p>
        </div>

        <div className="flex justify-center relative z-10">
            <motion.div 
                whileHover={{ y: -5 }}
                className="w-full max-w-lg p-8 md:p-12 rounded-[3rem] border border-white/10 bg-black/70 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group/demo"
            >
                <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 blur-[120px] rounded-full group-hover/demo:bg-primary/20 transition-all duration-700" />
                
                <div className="flex justify-between items-start mb-10">
                    <div className="text-left">
                        <Badge variant="outline" className={cn(
                            "mb-5 border-primary/30 text-primary transition-all duration-700 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]",
                            demoActive && "bg-primary/20 border-primary shadow-[0_0_20px_rgba(0,214,50,0.3)]"
                        )}>
                            {demoActive ? "Funds Locked" : "Payment Required"}
                        </Badge>
                        <h3 className="text-4xl font-black mb-2 tracking-tight text-white">Rolex Submariner</h3>
                        <p className="text-base text-muted-foreground font-bold italic">Seller: <span className="text-white">@watch_king_01</span></p>
                    </div>
                    <div className="p-5 rounded-[2rem] bg-black/40 border border-white/10 text-primary shadow-xl">
                        <LucidePackage className="w-10 h-10" />
                    </div>
                </div>

                <div className="space-y-6 mb-12">
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Deal ID</span>
                        <span className="font-mono text-sm bg-white/5 px-4 py-1.5 rounded-xl border border-white/5 text-white">#x402-8821</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Price</span>
                        <span className="text-3xl font-black text-primary tracking-tighter drop-shadow-2xl">500 CRO</span>
                    </div>
                </div>

                <div className="relative">
                    <Button 
                        onClick={handlePledge}
                        disabled={pledging || demoActive}
                        className={cn(
                            "w-full py-10 text-2xl font-black transition-all duration-500 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary/50",
                            demoActive 
                                ? "bg-white/5 text-primary cursor-default border-2 border-primary/20" 
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_20px_40px_rgba(0,214,50,0.4)] active:scale-95"
                        )}
                        aria-label={demoActive ? "Transaction confirmed" : "Pledge 500 CRO to unlock content"}
                        aria-disabled={pledging || demoActive}
                    >
                        {pledging ? (
                            <div className="flex items-center gap-4">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                                Signing...
                            </div>
                        ) : demoActive ? "Transaction Confirmed" : "Pledge 500 CRO"}
                    </Button>
                </div>
                
                <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-relaxed">
                    Powered by Cronos x402 Protocol.
                </p>
            </motion.div>
        </div>
      </section>

      {/* Use Case Carousel (Use Cases) */}
      <section id="cases" className="py-24 px-6 max-w-7xl mx-auto" role="region" aria-labelledby="cases-heading">
        <Carousel className="w-full" opts={{ loop: true }}>
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-left">
              <div className="max-w-2xl">
                  <h2 id="cases-heading" className="text-5xl md:text-6xl font-black mb-6 tracking-tighter leading-none text-white uppercase whitespace-nowrap">Use Cases</h2>
                  <p className="text-xl text-muted-foreground leading-relaxed font-bold">The settlement layer for social commerce.</p>
              </div>
              <div className="flex gap-4">
                  <CarouselPrevious className="static translate-y-0 h-14 w-14 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Previous use case" />
                  <CarouselNext className="static translate-y-0 h-14 w-14 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Next use case" />
              </div>
          </div>
          
          <CarouselContent className="-ml-6">
            {[
                { title: "r/Watchexchange", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", text: "Verify funds before shipping high-value watches." },
                { title: "Taylor Swift Eras Tour", img: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop", text: "End ticket scams with proof-of-pledge transfers." },
                { title: "Discord Hardware Swap", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=800&auto=format&fit=crop", text: "Secure GPU trades with zero chargeback risk." },
                { title: "Instagram Sneakers", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop", text: "Instant trust for high-demand limited drops." }
            ].map((item, index) => (
              <CarouselItem key={index} className="pl-6 md:basis-1/3">
                <Card className="border-white/5 bg-card/50 overflow-hidden group rounded-[2.5rem] h-full transition-all hover:border-primary/20 text-left">
                  <div className="aspect-[4/5] relative overflow-hidden">
                    <img src={item.img} alt={item.title} className="object-cover w-full h-full transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                        <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md mb-4 px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px] font-black">{item.title}</Badge>
                        <p className="text-white text-xl font-black leading-tight tracking-tight">{item.text}</p>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-16 px-6 border-t border-white/5 relative bg-[#0A0F14]" role="contentinfo" aria-label="Site footer">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Footer Logo */}
            <div className="relative w-24 h-24 mb-12 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <img src="/trucheq-logo-sz.jpeg" alt="TruCheq Logo" className="object-cover w-full h-full" />
            </div>

            <h3 className="text-6xl md:text-8xl font-black mb-16 tracking-tighter leading-none text-white uppercase">Ready to Settle?</h3>
            
            <div className="relative group mb-20 scale-110">
              <Link href="/app">
                <Button size="lg" className="px-16 py-10 text-3xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,214,50,0.3)] transition-all active:scale-95">
                    Launch App
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 mb-24 max-w-4xl w-full">
                <Button variant="link" asChild className="text-muted-foreground hover:text-primary text-sm font-black uppercase tracking-widest">
                    <a href="https://dorahacks.io/buidl/38487" target="_blank" rel="noopener noreferrer">Hackathon Submission</a>
                </Button>
                <Button variant="link" asChild className="text-muted-foreground hover:text-primary text-sm font-black uppercase tracking-widest">
                    <a href="https://github.com/open-biz/truecheq" target="_blank" rel="noopener noreferrer">GitHub Repo</a>
                </Button>
                <Button variant="link" asChild className="text-muted-foreground hover:text-primary text-sm font-black uppercase tracking-widest">
                    <a href="https://explorer.cronos.org/testnet/address/0x5216905cc7b7fF4738982837030921A22176c8C7" target="_blank" rel="noopener noreferrer">Cronos Contract</a>
                </Button>
                <Button variant="link" asChild className="text-muted-foreground hover:text-primary text-sm font-black uppercase tracking-widest">
                    <a href="https://dorahacks.io/hackathon/cronos-x402" target="_blank" rel="noopener noreferrer">Cronos x402 Hackathon</a>
                </Button>
            </div>
            
            <div className="flex flex-col items-center gap-6 text-sm text-muted-foreground font-black">
                <p className="tracking-[0.2em] uppercase">Built for <span className="text-white">Cronos x402 Hackathon</span>.</p>
                <p className="opacity-50 tracking-tighter">© 2026 TruCheq Protocol.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
