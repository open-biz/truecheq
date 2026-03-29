'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LucideDownload, 
  LucideSmartphone, 
  LucideShieldCheck, 
  LucideArrowRight, 
  LucideExternalLink,
  LucideMapPin,
  LucideCheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorldIDOnboardingProps {
  className?: string;
}

export function WorldIDOnboarding({ className }: WorldIDOnboardingProps) {
  return (
    <Card className={cn(
      'border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden',
      className
    )}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary">
            <LucideShieldCheck className="w-10 h-10" />
          </div>
        </div>
        
        <Badge variant="outline" className="mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-muted-foreground border-white/10">
          New to World ID?
        </Badge>
        
        <CardTitle className="text-2xl font-black italic tracking-tighter">
          Get Verified in 3 Steps
        </CardTitle>
        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
          Proof of Personhood
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Step 1: Download World App */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-black">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                Download World App
              </p>
            </div>
            <LucideDownload className="w-5 h-5 text-primary" />
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get the official Worldcoin app from the App Store or Google Play. This is your identity wallet.
          </p>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 rounded-xl border-white/10 hover:bg-white/5 text-xs font-black uppercase"
              asChild
            >
              <a href="https://apps.apple.com/worldcoin" target="_blank" rel="noopener noreferrer">
                <LucideSmartphone className="w-3 h-3 mr-2" /> iOS
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 rounded-xl border-white/10 hover:bg-white/5 text-xs font-black uppercase"
              asChild
            >
              <a href="https://play.google.com/worldcoin" target="_blank" rel="noopener noreferrer">
                <LucideSmartphone className="w-3 h-3 mr-2" /> Android
              </a>
            </Button>
          </div>
        </div>

        {/* Step 2: Choose Verification Level */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-black">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                Choose Verification
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Orb Verification */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <LucideShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase text-primary">Orb</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Full biometric iris scan at a physical Orb location. Highest trust level.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-primary">
                <LucideMapPin className="w-3 h-3" />
                <span>Find Orb near you</span>
              </div>
            </div>
            
            {/* Device Verification */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <LucideSmartphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase text-blue-400">Device</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Simple in-app verification via World App. Quick and easy setup.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-400">
                <LucideCheckCircle2 className="w-3 h-3" />
                <span>Instant verification</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Use with TruCheq */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-black">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest text-white">
                Start Trading
              </p>
            </div>
            <LucideArrowRight className="w-5 h-5 text-primary" />
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once verified, return to TruCheq and sign in with World ID to create verified listings and start trading securely.
          </p>
        </div>

        {/* Learn More Link */}
        <div className="pt-2 border-t border-white/5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
            asChild
          >
            <a href="https://worldcoin.org/download" target="_blank" rel="noopener noreferrer">
              <LucideExternalLink className="w-3 h-3 mr-2" />
              Learn more about World ID
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}