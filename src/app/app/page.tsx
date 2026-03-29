'use client';

import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { DealCreator } from '@/components/DealCreator';
import { DealDashboard } from '@/components/DealDashboard';
import { WorldIDAuth, type WorldIDUser } from '@/components/WorldIDAuth';
import { WorldIDOnboarding } from '@/components/WorldIDOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucidePlusCircle, LucideArrowLeft, LucideList, LucideShieldCheck, LucideSearch, LucideShoppingCart, LucideTag, LucideQrCode, LucideX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

// Storage key for user data
const STORAGE_KEY = 'trucheq_user_data';

interface SellerListing {
  cid: string;
  metadataUrl: string;
  itemName: string;
  price: string;
  imageUrl?: string;
  sellerAddress?: string;
}

export default function AppPage() {
  const [appSubView, setAppSubView] = useState<'create' | 'dashboard' | 'buyer'>('create');
  const [worldUser, setWorldUser] = useState<WorldIDUser | null>(null);
  const [mode, setMode] = useState<'seller' | 'buyer'>('buyer');
  const [mounted, setMounted] = useState(false);
  
  // Track wallet connection on client side only
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // TruCheq code lookup
  const [lookupCode, setLookupCode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundListings, setFoundListings] = useState<SellerListing[]>([]);
  const [showLookup, setShowLookup] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setWorldUser(userData);
      } catch (e) {
        console.error('Failed to load user from storage', e);
      }
    }
  }, []);

  // Save user to localStorage when changed
  useEffect(() => {
    if (worldUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(worldUser));
    }
  }, [worldUser]);

  const handleLogout = () => {
    setWorldUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setAppSubView('create');
    setMode('seller');
  };  // Demo listings - same as marketplace, loaded from IPFS
  // Note: All listings use XMTP agent address (0x8677e5831257e52a35d1463cfb414eda34344f4f) for DM
  const DEMO_MARKETPLACE_LISTINGS: SellerListing[] = [
    {
      cid: 'QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
      metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmVaTcgW2rqEjNRGsUSGi75D1YRhgtbya7SJhdQqjF9mbQ',
      itemName: 'Rolex Submariner Date',
      price: '1',
      imageUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/Qmav2DUgXVcQbuuWVeMoxHw8KTp85A8z1fb8gA7FygUZQE',
      sellerAddress: '0x8677e5831257e52a35d1463cfb414eda34344f4f' // XMTP agent address
    },
    {
      cid: 'Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
      metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/Qmcu7vPqyimqLrzjdeZbxKXj39D8LdyieLSkfU269LdtPp',
      itemName: 'Omega Speedmaster Professional',
      price: '1',
      imageUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmZ1hkzcci2MEwyESZxGXBmtkQ7rvCCosxdDQT75EiTBvX',
      sellerAddress: '0x8677e5831257e52a35d1463cfb414eda34344f4f'
    },
    {
      cid: 'QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
      metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmdfjExyMR2WqosXr9Vr8YU8ZVTLP31Be8nhnnrZLQNrDR',
      itemName: 'Cartier Santos de Cartier',
      price: '1',
      imageUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmQNtr8GhTkfkSHAQb7jNZmjC3WFpBvD9LXg9gqjwcYFqF',
      sellerAddress: '0x8677e5831257e52a35d1463cfb414eda34344f4f'
    },
    {
      cid: 'QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
      metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmNrwrBbkjFSui4EdUmTqdXNpdGuDeeV4p5HsRHWixfESN',
      itemName: 'Patek Philippe Calatrava',
      price: '1',
      imageUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmQzfspHYt9EMH2TavYSnU6vtwq6uGX5AtBGw2csp9oNnA',
      sellerAddress: '0x8677e5831257e52a35d1463cfb414eda34344f4f'
    },
    {
      cid: 'QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
      metadataUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmSnWxkB82MdtbHcJxpmqWYHSefhy47Kxf9hQY7d1UGZaZ',
      itemName: 'Audemars Piguet Royal Oak',
      price: '1',
      imageUrl: 'https://parallel-pink-stork.myfilebase.com/ipfs/QmVazpCrWnDJBJdR1LvEAE3mC6kju5nqqKB2JVVgfKSoSP',
      sellerAddress: '0x8677e5831257e52a35d1463cfb414eda34344f4f'
    },
  ];

const handleTruCheqLookup = async () => {
    const code = lookupCode.trim().toUpperCase();
    
    if (!code) {
      toast.error('Enter a TruCheq code');
      return;
    }

    setIsLookingUp(true);
    try {
      // Special demo code: FX4A shows all marketplace items
      if (code === 'FX4A') {
        toast.success('Found demo marketplace!');
        setFoundListings(DEMO_MARKETPLACE_LISTINGS);
        setIsLookingUp(false);
        return;
      }
      
      // TODO: In production, this would query an indexer or IPFS by nullifier
      // For now, show message about demo code
      toast.info('Enter FX4A to see demo marketplace listings');
      setFoundListings([]);
    } catch (e) {
      toast.error('Failed to lookup seller');
    } finally {
      setIsLookingUp(false);
    }
  };

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
            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                <Button
                  variant={mode === 'seller' ? 'secondary' : 'ghost'}
                  onClick={() => setMode('seller')}
                  className="rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest px-2 md:px-3"
                >
                  <LucideTag className="md:mr-1.5 w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sell</span>
                </Button>
                <Button
                  variant={mode === 'buyer' ? 'secondary' : 'ghost'}
                  onClick={() => setMode('buyer')}
                  className="rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest px-2 md:px-3"
                >
                  <LucideShoppingCart className="md:mr-1.5 w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buy</span>
                </Button>
              </div>

              {/* Seller Views */}
              {mode === 'seller' && (
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
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

              {/* Buyer Views */}
              {mode === 'buyer' && (
                <Button
                  variant="ghost"
                  onClick={() => setShowLookup(true)}
                  className="rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest px-2 md:px-4"
                >
                  <LucideSearch className="md:mr-2 w-4 h-4" /> <span className="hidden sm:inline">Find Seller</span>
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            {worldUser ? (
              <>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  <LucideX className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </>
            ) : null}
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
        ) : mode === 'buyer' ? (
          // Buyer Mode
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-white">Browse Listings</h2>
              <p className="text-sm text-muted-foreground mt-1 font-bold">Find verified sellers using their TruCheq code</p>
            </div>

            {/* Quick Lookup Card */}
            <Card className="max-w-md mx-auto border-white/10 bg-black/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <LucideQrCode className="text-primary w-5 h-5" />
                  Find a Seller
                </CardTitle>
                <CardDescription>Enter a TruCheq code to see their listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter TruCheq code (use Code FX4A)..."
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 font-mono"
                  />
                  <Button
                    onClick={handleTruCheqLookup}
                    disabled={isLookingUp || !lookupCode.trim()}
                    className="rounded-xl"
                  >
                    {isLookingUp ? '...' : <LucideSearch className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Get the code from the seller - it's their World ID nullifier
                </p>
              </CardContent>
            </Card>

            {/* Found Listings */}
            {foundListings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {foundListings.map((listing, i) => (
                  <Link key={i} href={`/deal/${listing.cid.slice(0, 12)}?meta=${encodeURIComponent(listing.metadataUrl)}`}>
                    <Card className="border-white/10 bg-black/60 backdrop-blur-xl hover:border-primary/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-white/5 rounded-xl mb-3 flex items-center justify-center">
                          {listing.imageUrl ? (
                            <img src={listing.imageUrl} alt={listing.itemName} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <LucideShoppingCart className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-black text-white truncate">{listing.itemName}</h3>
                        <p className="text-primary font-black text-lg">{listing.price} USDC</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty state */}
            {foundListings.length === 0 && !isLookingUp && (
              <div className="text-center py-12">
                <LucideShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-white font-bold">No listings found yet</p>
                <p className="text-sm text-muted-foreground">Enter a TruCheq code above to find sellers</p>
              </div>
            )}
          </div>
        ) : (
          // Seller Mode
          <AnimatePresence mode="wait">
            <motion.div
              key={appSubView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {appSubView === 'create'
                ? <DealCreator isOrbVerified={worldUser.isOrbVerified} walletAddress={worldUser.walletAddress} />
                : <DealDashboard />
              }
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Lookup Modal */}
      {showLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full mx-4 border-white/10 bg-black/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <LucideQrCode className="text-primary w-5 h-5" />
                  Find Seller by TruCheq Code
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowLookup(false)} className="rounded-xl">
                  <LucideX className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter TruCheq code (e.g., FX4A)"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                className="bg-white/5 border-white/10 font-mono text-lg text-center tracking-widest"
              />
              <Button
                onClick={() => {
                  handleTruCheqLookup();
                  setShowLookup(false);
                  setMode('buyer');
                }}
                disabled={isLookingUp || !lookupCode.trim()}
                className="w-full py-6 rounded-xl font-black"
              >
                {isLookingUp ? 'Searching...' : 'Find Listings'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Toaster position="bottom-right" theme="dark" richColors />
    </main>
  );
}