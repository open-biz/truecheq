'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideCheckCircle, LucideArrowLeft, LucideWallet, LucideLoader2, LucideExternalLink, LucideShieldCheck, LucideCoins, LucideCreditCard } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// USDC on Base Sepolia
const USDC_ADDRESS = '0x036cbd53842c5426634e7929545ec598f828a2b5';
const BASE_SEPOLIA_CHAIN_ID = 84532;

// USDC ABI for transfer
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

interface ListingMetadata {
  itemName: string;
  description: string;
  price: string;
  images: string[];
  seller: string;
  createdAt: number;
  isOrbVerified: boolean;
}

interface X402PaymentRequirement {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds?: number;
}

function parseX402Header(authHeader: string): X402PaymentRequirement | null {
  try {
    // Parse: x402 scheme=exact, network=eip155:84532, amount=$300, asset=USDC, payTo=0x...
    const parts = authHeader.split(',').map(p => p.trim());
    const req: Partial<X402PaymentRequirement> = {};
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key === 'scheme') req.scheme = value;
      else if (key === 'network') req.network = value;
      else if (key === 'amount') req.amount = value.replace('$', '');
      else if (key === 'asset') req.asset = value;
      else if (key === 'payTo') req.payTo = value;
      else if (key === 'maxTimeoutSeconds') req.maxTimeoutSeconds = parseInt(value);
    }
    
    return req as X402PaymentRequirement;
  } catch {
    return null;
  }
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const metadataUrl = searchParams.get('meta');
  const listingId = searchParams.get('id');
  
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: txHash, isPending: isSigning } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash: txHash 
  });
  
  const isCorrectChain = chain?.id === BASE_SEPOLIA_CHAIN_ID;
  
  const [metadata, setMetadata] = useState<ListingMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStep, setPaymentStep] = useState<'connect' | 'review' | 'paying' | 'confirmed'>('connect');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [x402Requirement, setX402Requirement] = useState<X402PaymentRequirement | null>(null);

  // Fetch listing metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!metadataUrl) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(metadataUrl);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetadata();
  }, [metadataUrl]);

  // Auto-advance to review when wallet connects on correct chain
  useEffect(() => {
    if (isConnected && isCorrectChain && paymentStep === 'connect') {
      setPaymentStep('review');
    }
  }, [isConnected, isCorrectChain, paymentStep]);

  // Track payment confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      setPaymentStep('confirmed');
      // Create a mock x402 payment proof (in production, this would come from the facilitator)
      setPaymentProof(`x402:${txHash}:${Date.now()}`);
      toast.success('Payment successful!', {
        description: `Paid ${metadata?.price} USDC via x402 protocol`,
      });
    }
  }, [isConfirmed, txHash, metadata?.price]);

  const handleSwitchChain = () => {
    switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
  };

  // Handle x402 payment flow
  const handlePay = async () => {
    if (!metadata || !metadata.seller) {
      toast.error('Missing seller address');
      return;
    }

    setPaymentStep('paying');
    setPaymentError(null);
    setX402Requirement(null);

    try {
      // Step 1: Make initial request to x402 endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const x402Url = `${baseUrl}/api/deal/${listingId}/x402?meta=${encodeURIComponent(metadataUrl || '')}`;

      console.log('[x402] Initiating payment to:', x402Url);

      // First, try to get the x402 payment requirements
      const initialResponse = await fetch(x402Url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // If 402, parse the WWW-Authenticate header for payment requirements
      if (initialResponse.status === 402) {
        const authHeader = initialResponse.headers.get('WWW-Authenticate');
        if (authHeader && authHeader.startsWith('x402')) {
          const req = parseX402Header(authHeader);
          if (req) {
            setX402Requirement(req);
            console.log('[x402] Payment requirement:', req);
          }
        }
      }

      // Step 2: Make the USDC payment via wallet
      const amountUSDC = parseUnits(metadata.price, 6);
      
      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [metadata.seller as `0x${string}`, amountUSDC],
      });

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      setPaymentStep('review');
      toast.error('Payment failed', {
        description: errorMessage,
      });
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <LucideLoader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Loading listing...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!metadata) {
    return (
      <main className="min-h-screen bg-[#0A0F14] text-foreground">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md w-full border-white/10 bg-black/80 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <p className="text-lg font-black text-white mb-2">Listing Not Found</p>
              <p className="text-sm text-muted-foreground mb-6">No metadata URL provided.</p>
              <Link href="/">
                <Button variant="outline" className="rounded-xl">Go Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Payment confirmed - show success
  if (paymentStep === 'confirmed' || isConfirmed) {
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
                x402 PAYMENT COMPLETE
              </Badge>
              <CardTitle className="text-4xl font-black italic tracking-tighter">USDC Transferred</CardTitle>
              <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">
                {metadata.price} USDC via x402
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Item</span>
                  <span className="text-sm font-bold text-white">{metadata.itemName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seller</span>
                  <span className="text-xs font-mono text-primary">{metadata.seller.slice(0, 6)}...{metadata.seller.slice(-4)}</span>
                </div>
                {txHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tx Hash</span>
                    <a 
                      href={`https://sepolia.basescan.org/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary flex items-center gap-1 hover:underline"
                    >
                      {txHash.slice(0, 8)}...{txHash.slice(-6)}
                      <LucideExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {paymentProof && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Proof</span>
                    <span className="text-xs font-mono text-green-400">Verified</span>
                  </div>
                )}
              </div>
              <Link href={`/deal/${listingId}?meta=${encodeURIComponent(metadataUrl || '')}`} className="block">
                <Button variant="outline" className="w-full rounded-2xl border-white/10 hover:bg-white/5 py-6 font-black uppercase tracking-widest text-xs">
                  <LucideArrowLeft className="w-4 h-4 mr-2" /> Return to Listing
                </Button>
              </Link>
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Payment via x402 Protocol on Base Sepolia
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Pre-payment states
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
        <Card className="max-w-lg w-full border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20">
                <LucideCreditCard className="w-12 h-12 text-primary" />
              </div>
            </div>
            <Badge variant="outline" className="mx-auto mb-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40">
              x402 Payment
            </Badge>
            <CardTitle className="text-3xl font-black italic tracking-tighter">{metadata.itemName}</CardTitle>
            <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-2">
              Coinbase x402 Protocol
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price</span>
                <span className="text-3xl font-black text-primary">{metadata.price} USDC</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seller</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white">{metadata.seller.slice(0, 8)}...</span>
                  {metadata.isOrbVerified && (
                    <LucideShieldCheck className="w-4 h-4 text-primary" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Protocol</span>
                <Badge variant="outline" className="text-[10px] font-black uppercase bg-purple-500/10 text-purple-400 border-purple-500/20">
                  x402
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Network</span>
                <Badge variant="outline" className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border-blue-500/20">
                  Base Sepolia
                </Badge>
              </div>
            </div>

            {/* Payment Error */}
            {paymentError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 font-bold">
                  {paymentError}
                </p>
              </div>
            )}

            {/* x402 Payment Requirement */}
            {x402Requirement && (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <p className="text-xs text-primary font-bold mb-2">x402 Payment Required</p>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <p>Amount: {x402Requirement.amount} USDC</p>
                  <p>To: {x402Requirement.payTo?.slice(0, 10)}...</p>
                </div>
              </div>
            )}

            {/* Wallet Connection */}
            {paymentStep === 'connect' && (
              <div className="space-y-4">
                {!isConnected ? (
                  <div className="flex justify-center">
                    <ConnectButton 
                      chainStatus="icon"
                      accountStatus="address"
                      showBalance={false}
                    />
                  </div>
                ) : chain === undefined ? (
                  <div className="flex justify-center py-6">
                    <LucideLoader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !isCorrectChain ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-xs text-yellow-400 font-bold">
                        Please switch to Base Sepolia for x402 payments
                      </p>
                    </div>
                    <Button 
                      onClick={handleSwitchChain}
                      className="w-full py-6 text-lg font-black bg-yellow-500 text-black hover:bg-yellow-400 rounded-2xl"
                    >
                      <LucideWallet className="w-5 h-5 mr-3" />
                      Switch to Base Sepolia
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setPaymentStep('review')}
                    className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_20px_40px_rgba(0,214,50,0.3)]"
                  >
                    <LucideWallet className="w-6 h-6 mr-3" />
                    Continue to Pay
                  </Button>
                )}
                <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Secure x402 payment with wallet signature
                </p>
              </div>
            )}

            {/* Review & Pay */}
            {paymentStep === 'review' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400 font-bold">
                    You will sign a payment authorization via wallet. This enables automatic USDC transfer through the x402 protocol.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <LucideCheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                    <p className="text-[10px] text-muted-foreground">Ready for x402 payment</p>
                  </div>
                </div>

                <Button 
                  onClick={handlePay}
                  disabled={isSigning}
                  className="w-full py-8 text-xl font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-[0_20px_40px_rgba(0,214,50,0.3)] disabled:opacity-50"
                >
                  {isSigning ? (
                    <>
                      <LucideLoader2 className="w-6 h-6 mr-3 animate-spin" />
                      Confirm in Wallet...
                    </>
                  ) : (
                    <>
                      <LucideCoins className="w-6 h-6 mr-3" />
                      Pay {metadata.price} USDC
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Paying State */}
            {(paymentStep === 'paying' || isSigning) && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <LucideLoader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg font-black text-white">Processing x402 Payment...</p>
                  <p className="text-sm text-muted-foreground">
                    {isSigning ? 'Confirm the transaction in your wallet' : 'Initiating payment...'}
                  </p>
                </div>
              </div>
            )}

            {/* Confirming State */}
            {isConfirming && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 py-4">
                  <LucideLoader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg font-black text-white">Confirming Transaction...</p>
                  <p className="text-sm text-muted-foreground">Waiting for on-chain confirmation</p>
                </div>
              </div>
            )}

            <Link 
              href={`/deal/${listingId}?meta=${encodeURIComponent(metadataUrl || '')}`}
              className="block"
            >
              <Button variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-white">
                <LucideArrowLeft className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}