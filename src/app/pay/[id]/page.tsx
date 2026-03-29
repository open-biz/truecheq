'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideCheckCircle, LucideArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PaymentConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);

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
        </div>
      </nav>

      <div className="flex items-center justify-center px-6 py-24 relative z-10">
        <Card className="max-w-lg w-full border-primary/20 bg-black/80 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-[2.5rem] border-t-primary/20">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary">
                <LucideCheckCircle className="w-12 h-12" />
              </div>
            </div>
            <Badge variant="outline" className="mx-auto mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40">
              PAYMENT CONFIRMED
            </Badge>
            <CardTitle className="text-4xl font-black italic tracking-tighter">x402 Settlement Complete</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">
              Listing #{resolvedParams.id} • Base Sepolia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm font-black text-primary uppercase tracking-widest">Funds Settled via x402 Protocol</p>
              <p className="text-xs text-muted-foreground mt-2">Payment has been verified and settled on Base Sepolia.</p>
            </div>
            <Link href={`/deal/${resolvedParams.id}`} className="block">
              <Button variant="outline" className="w-full rounded-2xl border-white/10 hover:bg-white/5 py-6 font-black uppercase tracking-widest text-xs">
                <LucideArrowLeft className="w-4 h-4 mr-2" /> Return to Listing
              </Button>
            </Link>
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Powered by Coinbase x402 Protocol
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
