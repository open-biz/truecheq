"use client";

import React, { useRef } from "react";
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
import { 
  BackgroundBeams, 
  BorderBeam, 
  Marquee, 
  TruCheqCoin, 
  AnimatedBeam 
} from "@/components/ui/code-graphics";

export default function LandingPage() {
  const [isLocked, setIsLocked] = React.useState(true);
  const [pledging, setPledging] = React.useState(false);
  const [demoActive, setDemoActive] = React.useState(false);

  // Refs for AnimatedBeam
  const containerRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const trucheqRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <BackgroundBeams className="opacity-40" />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary bg-primary/5 backdrop-blur-sm">
              🏆 Built for the Cronos Hackathon
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-8"
          >
            The Missing <span className="text-primary italic">'Buy Now'</span> <br className="hidden md:block" /> Button for Your DMs.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Turn any chat thread into a secure point-of-sale with x402 settlement logic. 
            The protocol that bonds identity to funds on the Cronos EVM.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <div className="relative group">
              <BorderBeam size={100} duration={4} borderWidth={2} />
              <Button size="lg" className="px-10 py-8 text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-xl">
                Create TruCheq <LucideArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
            <Button size="lg" variant="ghost" className="px-10 py-8 text-xl font-bold hover:bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
              View Demo <LucidePlayCircle className="ml-2 w-6 h-6" />
            </Button>
          </motion.div>
        </div>

        {/* Floating Decoration */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <div className="w-1 h-12 rounded-full bg-gradient-to-b from-primary to-transparent" />
        </div>
      </section>

      {/* Bento Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          
          {/* Box 1 (Large) - The x402 Lock */}
          <Card className="md:col-span-2 md:row-span-2 relative overflow-hidden group border-white/5 bg-card/50 backdrop-blur-xl">
            <BorderBeam duration={10} size={400} />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <LucideLock className="w-8 h-8" />
                 </div>
                 <div className="flex items-center gap-3 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full transition-colors ${isLocked ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                        {isLocked ? "402 PAYMENT REQUIRED" : "200 OK"}
                    </span>
                    <Switch checked={!isLocked} onCheckedChange={(v) => setIsLocked(!v)} />
                 </div>
              </div>
              <CardTitle className="text-4xl font-bold mb-4">The x402 Protocol</CardTitle>
              <CardDescription className="text-xl max-w-md leading-relaxed">
                Identity and Deal Details are cryptographically locked until funds are pledged. 
                No screenshots. No fakes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center mt-4">
                <div className="w-full max-w-sm p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md flex items-center gap-6 shadow-2xl">
                    <TruCheqCoin active={!isLocked} />
                    <div className="flex-1 space-y-3">
                        <div className={`h-3 rounded-full transition-all duration-500 ${isLocked ? 'w-1/3 bg-white/10' : 'w-full bg-primary/20'}`} />
                        <div className={`h-3 rounded-full transition-all duration-500 ${isLocked ? 'w-2/3 bg-white/5' : 'w-3/4 bg-primary/10'}`} />
                    </div>
                    <div className={cn(
                        "p-3 rounded-xl transition-all duration-500",
                        isLocked ? "bg-white/5 text-white/10" : "bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,214,50,0.3)]"
                    )}>
                        <LucideUnlock className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Box 2 (Tall) - Settlement Stream */}
          <Card className="md:row-span-3 border-white/5 bg-card/50 backdrop-blur-xl relative overflow-hidden flex flex-col">
            <CardHeader className="relative z-10 bg-gradient-to-b from-card to-transparent pb-8">
              <div className="p-3 w-fit rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-6">
                <LucideZap className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Live Settlement</CardTitle>
              <CardDescription className="text-base">
                Instant finality on Cronos EVM.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-card to-transparent z-10" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent z-10" />
              
              <Marquee vertical repeat={10} className="[--duration:20s]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 mx-4 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-sm">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=tx-${i}`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-bold">0x...{Math.random().toString(16).slice(2, 6)}</p>
                      <p className="text-xs text-primary font-mono">{Math.floor(Math.random() * 1000 + 100)} CRO</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">Just now</div>
                  </div>
                ))}
              </Marquee>
            </CardContent>
          </Card>

          {/* Box 3 (Small) - Animated Beam */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-xl relative overflow-hidden" ref={containerRef}>
            <CardHeader className="pb-2">
               <LucideShieldCheck className="w-6 h-6 text-primary mb-2" />
               <CardTitle className="text-xl">The Trust Anchor</CardTitle>
            </CardHeader>
            <CardContent>
               <CardDescription className="mb-4">
                Bridges DeFi Wallets to active merchant terminals.
               </CardDescription>
               
               <div className="flex items-center justify-between px-4 mt-8 relative">
                  <div ref={walletRef} className="z-10 p-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
                     <img src="https://crypto.com/static/06000c0f8623631f4a9b561c20141b71/6a798/defi-wallet.png" alt="CDC" className="w-10 h-10 object-contain" />
                  </div>
                  <div ref={trucheqRef} className="z-10 p-3 rounded-xl bg-black/60 border border-primary/20 backdrop-blur-md">
                     <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg text-primary-foreground font-bold italic">T</div>
                  </div>
                  
                  <AnimatedBeam 
                    containerRef={containerRef} 
                    fromRef={walletRef} 
                    toRef={trucheqRef} 
                    curvature={-40}
                  />
               </div>
            </CardContent>
          </Card>

          {/* Box 4 (Small) - No Middlemen */}
          <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
            <CardHeader className="pb-2">
               <LucideUsers className="w-6 h-6 text-primary mb-2" />
               <CardTitle className="text-xl">Zero Sale Fees</CardTitle>
            </CardHeader>
            <CardContent>
               <CardDescription>
                We charge for the software, not your hard-earned margins.
               </CardDescription>
               <div className="mt-6 flex flex-col gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>Legacy Platforms</span>
                        <span>15% Fee</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1 }} className="h-full bg-destructive/50" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-primary font-bold">
                        <span>TruCheq</span>
                        <span>0% Fee</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: "2%" }} transition={{ duration: 1 }} className="h-full bg-primary" />
                    </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-32 px-6 bg-black/20 relative">
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center mb-20 relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">See it in Action</h2>
            <p className="text-xl text-muted-foreground">Experience the frictionless x402 settlement flow.</p>
        </div>

        <div className="flex justify-center relative z-10">
            <motion.div 
                whileHover={{ y: -5 }}
                className="w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full" />
                
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <Badge variant="outline" className={cn(
                            "mb-4 border-primary/30 text-primary transition-all duration-500 px-4 py-1",
                            demoActive && "bg-primary/20 border-primary shadow-[0_0_15px_rgba(0,214,50,0.2)]"
                        )}>
                            {demoActive ? "Funds Locked" : "Payment Required"}
                        </Badge>
                        <h3 className="text-3xl font-bold mb-1">Rolex Submariner</h3>
                        <p className="text-sm text-muted-foreground font-medium">Seller: <span className="text-white">@watch_king_01</span></p>
                    </div>
                    <div className="p-4 rounded-3xl bg-black/40 border border-white/10 text-primary">
                        <LucidePackage className="w-8 h-8" />
                    </div>
                </div>

                <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-muted-foreground font-medium">Deal ID</span>
                        <span className="font-mono text-sm bg-white/5 px-3 py-1 rounded-lg">#x402-8821</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-muted-foreground font-medium">Contract Price</span>
                        <span className="text-2xl font-bold text-primary tracking-tight">500 CRO</span>
                    </div>
                </div>

                <div className="relative">
                    {!demoActive && <BorderBeam duration={3} size={150} />}
                    <Button 
                        onClick={handlePledge}
                        disabled={pledging || demoActive}
                        className={cn(
                            "w-full py-8 text-xl font-bold transition-all duration-500 rounded-2xl",
                            demoActive 
                                ? "bg-white/5 text-primary cursor-default border border-primary/20" 
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_30px_rgba(0,214,50,0.3)]"
                        )}
                    >
                        {pledging ? (
                            <div className="flex items-center gap-3">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                                Signing...
                            </div>
                        ) : demoActive ? "Transaction Confirmed" : "Pledge 500 CRO"}
                    </Button>
                </div>
                
                <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                    Powered by Cronos x402 Gateway. <br />
                    Funds held in trust until manual release.
                </p>
            </motion.div>
        </div>
      </section>

      {/* Use Case Carousel */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <Carousel className="w-full" opts={{ loop: true }}>
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Global P2P Settlements</h2>
                  <p className="text-lg text-muted-foreground">The protocol that works wherever you do business.</p>
              </div>
              <div className="flex gap-2">
                  <CarouselPrevious className="static translate-y-0 h-12 w-12 border-white/10 bg-white/5 hover:bg-white/10" />
                  <CarouselNext className="static translate-y-0 h-12 w-12 border-white/10 bg-white/5 hover:bg-white/10" />
              </div>
          </div>
          
          <CarouselContent className="-ml-4">
            {[
                { title: "r/Watchexchange", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop", text: "Buy with confidence. Verify funds before shipping." },
                { title: "Taylor Swift Eras Tour", img: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop", text: "Stop ticket scams. No ticket transfer until CRO is locked." },
                { title: "Discord Hardware Swap", img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=800&auto=format&fit=crop", text: "Sell your GPU safely. No chargeback risk." }
            ].map((item, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/3">
                <Card className="border-white/5 bg-card/50 overflow-hidden group rounded-3xl h-full">
                  <div className="aspect-[4/5] relative overflow-hidden">
                    <img src={item.img} alt={item.title} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                        <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md mb-3 px-3 py-1">{item.title}</Badge>
                        <p className="text-white font-medium leading-snug">{item.text}</p>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Footer */}
      <footer className="pt-32 pb-16 px-6 border-t border-white/5 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-10 text-3xl font-bold tracking-tighter italic">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground not-italic shadow-[0_0_20px_rgba(0,214,50,0.4)]">T</div>
                TruCheq
            </div>
            
            <h3 className="text-5xl md:text-7xl font-bold mb-12 tracking-tight">Ready to Settle?</h3>
            
            <div className="relative group mb-20">
              <BorderBeam size={120} duration={6} />
              <Button size="lg" className="px-12 py-9 text-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl">
                  Launch App
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-10 mb-20">
                <Button variant="link" className="text-muted-foreground hover:text-primary text-base">View Contract</Button>
                <Button variant="link" className="text-muted-foreground hover:text-primary text-base">GitHub Repo</Button>
                <Button variant="link" className="text-muted-foreground hover:text-primary text-base">Documentation</Button>
                <Button variant="link" className="text-muted-foreground hover:text-primary text-base">Hackathon Submission</Button>
            </div>
            
            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
                <p className="font-medium">Built with ❤️ for the Cronos x402 Hackathon.</p>
                <p>© 2026 TruCheq Protocol. All rights reserved.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}