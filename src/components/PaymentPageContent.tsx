'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { WorldWalletButton } from '@/components/WorldWalletButton';
import { parseUnits, encodeFunctionData, type Hex, createPublicClient, http } from 'viem';
import { worldChain, base } from '@/lib/chains';
import { MiniKit } from '@worldcoin/minikit-js';
import { useUserOperationReceipt } from '@worldcoin/minikit-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LucideCheckCircle, LucideArrowLeft, LucideWallet, LucideLoader2, LucideExternalLink, LucideShieldCheck, LucideCoins, LucideCreditCard, LucideSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { STORAGE_KEYS, cn, getProxiedImageUrl } from '@/lib/utils';
import { useIsMiniApp } from '@/lib/use-mini-app';
import {
  USDC_ADDRESS_BASE,
  USDC_ADDRESS_WORLD,
  WORLD_CHAIN_NUM as WORLD_CHAIN_ID,
  BASE_CHAIN_NUM as BASE_CHAIN_ID,
} from '@/lib/x402';
import {
  TopBar,
  CircularIcon,
} from '@worldcoin/mini-apps-ui-kit-react';

// Chain names
const CHAIN_NAMES: Record<number, string> = {
  [WORLD_CHAIN_ID]: 'World Chain',
  [BASE_CHAIN_ID]: 'Base',
};

// Chain icons (emoji for now, could be images)
const CHAIN_ICONS: Record<number, string> = {
  [WORLD_CHAIN_ID]: '🌍',
  [BASE_CHAIN_ID]: '🔵',
};

// USDC ABI for transfer (used by both wagmi writeContract and MiniKit encodeFunctionData)
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

// ============================================================================
// Component: Page Header (compact, hidden in mini app)
// ============================================================================

function PageHeader({ isMiniApp }: { isMiniApp: boolean }) {
  if (isMiniApp) {
    return (
      <TopBar
        title="Payment"
        startAdornment={
          <Link href="/">
            <CircularIcon size="sm">
              <img src="/trucheq-logo-sz.jpeg" alt="TruCheq" className="w-full h-full object-cover rounded-full" />
            </CircularIcon>
          </Link>
        }
      />
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
            <img src="/trucheq-logo-sz.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Payment
        </span>
      </div>
    </header>
  );
}

// ============================================================================
// INNER: PaymentPageContentInner (uses useSearchParams — must be inside Suspense)
// ============================================================================

function PaymentPageContentInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const metadataUrl = searchParams.get('meta');
  const listingId = id;
  const isMiniApp = useIsMiniApp();

  const dealBackUrl = `/deal/${listingId}${metadataUrl ? `?meta=${encodeURIComponent(metadataUrl)}` : ''}`;
  // Mini App: back navigation (standalone has header with back link)
  const miniAppDealBack = isMiniApp && (
    <Link href={dealBackUrl} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
      <LucideArrowLeft className="w-3 h-3" />
      Back to Listing
    </Link>
  );
  
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // Track selected payment chain (World Chain by default) — must be declared before receiptPublicClient
  const [selectedChain, setSelectedChain] = useState<number>(WORLD_CHAIN_ID);
  const isCorrectChain = chain?.id === selectedChain;

  // ---- Wagmi path (standalone browser) ----
  const { writeContract, data: wagmiTxHash, isPending: isWagmiSigning } = useWriteContract();
  const { isLoading: isWagmiConfirming, isSuccess: isWagmiConfirmed } = useWaitForTransactionReceipt({
    hash: isMiniApp ? undefined : wagmiTxHash, // Only poll via wagmi when NOT in World App
  });

  // ---- MiniKit path (World App) ----
  // Create a memoized viem PublicClient for useUserOperationReceipt.
  // wagmi's useClient() returns a type with optional account that doesn't match.
  const receiptPublicClient = useMemo(() => {
    const chainConfig = selectedChain === WORLD_CHAIN_ID
      ? worldChain
      : base;
    return createPublicClient({ chain: chainConfig, transport: http() });
  }, [selectedChain]);

  const { poll: pollUserOpReceipt, isLoading: isUserOpPolling } = useUserOperationReceipt({
    client: receiptPublicClient,
  });

  // ---- Unified transaction state ----
  const [userOpHash, setUserOpHash] = useState<string | null>(null);  // World App userOpHash
  const [finalTxHash, setFinalTxHash] = useState<Hex | null>(null);   // Final on-chain tx hash (both paths)
  const [isSigning, setIsSigning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Load buyer data from localStorage
  const [buyerData, setBuyerData] = useState<{ isOrbVerified: boolean; nullifierHash: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BUYER);
    if (stored) {
      try {
        setBuyerData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load buyer data', e);
      }
    }
  }, []);
  
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

  // ---- Wagmi receipt tracking (standalone browser) ----
  useEffect(() => {
    if (!isMiniApp && isWagmiConfirmed && wagmiTxHash) {
      setFinalTxHash(wagmiTxHash);
      setIsConfirmed(true);
      setIsConfirming(false);
    }
  }, [isMiniApp, isWagmiConfirmed, wagmiTxHash]);

  // ---- Wagmi confirming state ----
  useEffect(() => {
    if (!isMiniApp && isWagmiConfirming) {
      setIsConfirming(true);
    }
  }, [isMiniApp, isWagmiConfirming]);

  // ---- MiniKit userOpHash receipt polling (World App) ----
  // Polls every 3s until the bundler confirms the userOp and we get a transactionHash.
  useEffect(() => {
    if (!isMiniApp || !userOpHash) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pollForReceipt = async () => {
      try {
        const result = await pollUserOpReceipt(userOpHash);
        if (!cancelled && result?.transactionHash) {
          setFinalTxHash(result.transactionHash);
          setIsConfirmed(true);
          setIsConfirming(false);
          // Stop polling once confirmed
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        // Bundler hasn't confirmed yet — normal during the first few seconds.
        // Keep polling; don't set an error.
        console.log('[Payment] UserOp receipt not ready yet, retrying...');
      }
    };

    // Initial poll immediately, then every 3s
    pollForReceipt();
    intervalId = setInterval(pollForReceipt, 3000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMiniApp, userOpHash, pollUserOpReceipt]);

  // ---- Unified: handle payment confirmed (both paths converge here) ----
  // Guard against firing multiple times (useCallback deps can change after confirmation)
  const hasConfirmedRef = useRef(false);
  const handlePaymentConfirmed = useCallback((txHash: Hex) => {
    setPaymentStep('confirmed');
    setPaymentProof(`x402:${txHash}:${Date.now()}`);
    toast.success('Payment successful!', {
      description: `Paid ${metadata?.price} USDC via x402 protocol`,
    });

    // Send payment confirmation to seller via XMTP so they know they got paid
    if (metadata?.seller && txHash && address) {
      fetch('/api/xmtp/system-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'payment-confirmed',
          recipientAddress: metadata.seller,
          payload: {
            amount: metadata.price,
            txHash: txHash,
          }
        })
      }).then(res => {
        if (res.ok) {
          console.log('[Payment] Payment confirmation sent to seller via XMTP');
        } else {
          return res.json();
        }
      }).then(data => {
        if (data?.error) {
          console.warn('[Payment] XMTP system message error:', data.error);
        }
      }).catch(err => {
        console.error('[Payment] Failed to send system message:', err);
      });
    }
  }, [metadata?.price, metadata?.seller, address]);

  // Fire handlePaymentConfirmed once when isConfirmed becomes true
  useEffect(() => {
    if (isConfirmed && finalTxHash && !hasConfirmedRef.current) {
      hasConfirmedRef.current = true;
      handlePaymentConfirmed(finalTxHash);
    }
  }, [isConfirmed, finalTxHash, handlePaymentConfirmed]);

  const handleSwitchChain = () => {
    switchChain({ chainId: selectedChain });
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
          try {
            const data = JSON.parse(await initialResponse.text());
            if (data.networks?.length > 1) {
              const networkIndex = selectedChain === WORLD_CHAIN_ID ? 0 : 1;
              const network = data.networks[networkIndex] || data.networks[0];
              const assetEntry = data.assets?.find((a: { network: string }) => a.network === network) || (data.assets?.[0] ?? null);
              if (assetEntry) {
                setX402Requirement({
                  scheme: data.scheme,
                  network,
                  amount: data.price,
                  asset: assetEntry.asset,
                  payTo: data.payTo,
                  maxTimeoutSeconds: data.maxTimeoutSeconds,
                });
              }
            } else if (data.network) {
              setX402Requirement({
                scheme: data.scheme,
                network: data.network,
                amount: data.price,
                asset: data.asset,
                payTo: data.payTo,
                maxTimeoutSeconds: data.maxTimeoutSeconds,
              });
            }
          } catch {
            const req = parseX402Header(authHeader);
            if (req) {
              setX402Requirement(req);
            }
          }
        }
      }

      // Step 2: Make the USDC payment
      const amountUSDC = parseUnits(metadata.price, 6);
      const usdcAddress = selectedChain === WORLD_CHAIN_ID ? USDC_ADDRESS_WORLD : USDC_ADDRESS_BASE;

      if (isMiniApp) {
        // ---- World App path: MiniKit.sendTransaction (ERC-4337) ----
        setIsSigning(true);
        // Encode the USDC transfer calldata manually (MiniKit uses raw calldata, not ABI)
        const calldata = encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [metadata.seller as `0x${string}`, amountUSDC],
        });

        const result = await MiniKit.sendTransaction({
          transactions: [{
            to: usdcAddress,
            data: calldata,
          }],
          chainId: selectedChain,
        });

        // CommandResultByVia = { executedWith: 'minikit' | 'wagmi' | 'fallback', data: SendTransactionV2Result }
        // SendTransactionV2Result = { userOpHash: string, status: 'success', version, from, timestamp }
        setIsSigning(false);
        if (result.executedWith === 'minikit') {
          if (result.data.status === 'success' && result.data.userOpHash) {
            setUserOpHash(result.data.userOpHash);
            setIsConfirming(true);
          } else {
            throw new Error(result.data.status === 'success'
              ? 'No userOpHash returned from MiniKit.sendTransaction'
              : `Transaction rejected by bundler (status: ${result.data.status ?? 'unknown'})`);
          }
        } else {
          // Fallback path (wagmi/fallback) — result.data.userOpHash contains the regular tx hash
          const fallbackHash = result.data.userOpHash;
          if (fallbackHash) {
            setFinalTxHash(fallbackHash as Hex);
            setIsConfirmed(true);
            setIsConfirming(false);
          }
        }
      } else {
        // ---- Standalone browser path: wagmi writeContract (standard EOA) ----
        // isWagmiSigning / isWagmiConfirming / isWagmiConfirmed hooks handle the lifecycle
        writeContract({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [metadata.seller as `0x${string}`, amountUSDC],
        });
      }

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      setPaymentStep('review');
      setIsSigning(false);
      toast.error('Payment failed', {
        description: errorMessage,
      });
    }
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />
        <PageHeader isMiniApp={isMiniApp} />
        <div className="max-w-lg mx-auto px-4 py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <LucideLoader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Loading listing...</p>
          </div>
        </div>
      </main>
    );
  }

  // ---- Not found state ----
  if (!metadata) {
    return (
      <main className="min-h-screen bg-[#0A0F14] text-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />
        <PageHeader isMiniApp={isMiniApp} />
        <div className="max-w-lg mx-auto px-4 py-12">
          {/* Mini App: back to marketplace (no listing to go back to) */}
          {isMiniApp && (
            <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">
              <LucideArrowLeft className="w-3 h-3" />
              Back to Marketplace
            </Link>
          )}
          <Card className="border-white/10 bg-black/80 backdrop-blur-xl rounded-2xl">
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

  // ---- Payment confirmed - show success ----
  // Derive txHash for display from either path
  const displayTxHash = finalTxHash || wagmiTxHash;

  if (paymentStep === 'confirmed' || isConfirmed) {
    return (
      <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />
        <PageHeader isMiniApp={isMiniApp} />

        <div className="max-w-lg mx-auto px-4 py-8">
          {miniAppDealBack}

          <Card className="border-primary/20 bg-black/80 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-2xl border-t-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                  <LucideCheckCircle className="w-8 h-8" />
                </div>
              </div>
              <Badge variant="outline" className="mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40">
                x402 PAYMENT COMPLETE
              </Badge>
              <CardTitle className="text-2xl font-black italic tracking-tighter">USDC Transferred</CardTitle>
              <CardDescription className="text-sm font-bold uppercase tracking-tighter opacity-50 mt-1">
                {metadata.price} USDC via x402
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buyer Verification Status */}
              {buyerData && (
                <div className={cn(
                  'p-3 rounded-xl border',
                  buyerData.isOrbVerified
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-blue-500/10 border-blue-500/20'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'p-1.5 rounded-lg',
                        buyerData.isOrbVerified
                          ? 'bg-primary/20 text-primary'
                          : 'bg-blue-500/20 text-blue-400'
                      )}>
                        {buyerData.isOrbVerified
                          ? <LucideShieldCheck className="w-3 h-3" />
                          : <LucideSmartphone className="w-3 h-3" />
                        }
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          {buyerData.isOrbVerified ? 'Orb' : 'Device'} Verified Buyer
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          World ID: {buyerData.nullifierHash.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[9px] font-black uppercase',
                      buyerData.isOrbVerified
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    )}>
                      Verified
                    </Badge>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</span>
                  <span className="text-sm font-bold text-white">{metadata.itemName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seller</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white">{metadata.seller.slice(0, 8)}...</span>
                    {metadata.isOrbVerified && (
                      <LucideShieldCheck className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Buyer</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
                {displayTxHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tx Hash</span>
                    <a 
                      href={selectedChain === WORLD_CHAIN_ID
                        ? `https://worldchain-mainnet.g.alchemy.com/explorer/tx/${displayTxHash}`
                        : `https://basescan.org/tx/${displayTxHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-primary flex items-center gap-1 hover:underline"
                    >
                      {displayTxHash.slice(0, 6)}...{displayTxHash.slice(-4)}
                      <LucideExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {paymentProof && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proof</span>
                    <span className="text-[10px] font-mono text-green-400">x402 Verified</span>
                  </div>
                )}
              </div>

              <Link href={dealBackUrl} className="block">
                <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5 py-4 font-black uppercase tracking-widest text-xs">
                  <LucideArrowLeft className="w-4 h-4 mr-2" /> Return to Listing
                </Button>
              </Link>
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                x402 Protocol on {CHAIN_NAMES[selectedChain]}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ---- Pre-payment states ----
  return (
    <main className="min-h-screen bg-[#0A0F14] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />
      <PageHeader isMiniApp={isMiniApp} />

      <div className="max-w-lg mx-auto px-4 py-8">
        {miniAppDealBack}

        <Card className="border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <LucideCreditCard className="w-8 h-8 text-primary" />
              </div>
            </div>
            <Badge variant="outline" className="mx-auto mb-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border-primary/40">
              x402 Payment
            </Badge>
            <CardTitle className="text-xl font-black italic tracking-tighter">{metadata.itemName}</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1">
              Coinbase x402 Protocol
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Listing Image */}
            {metadata.images && metadata.images.length > 0 && (
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <img
                  src={getProxiedImageUrl(metadata.images[0])}
                  alt={metadata.itemName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Payment Details */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</span>
                <span className="text-2xl font-black italic tracking-tighter text-primary">
                  {metadata.price} <span className="text-[10px] font-bold text-primary/60 not-italic">USDC</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seller</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white">{metadata.seller.slice(0, 6)}...{metadata.seller.slice(-4)}</span>
                  {metadata.isOrbVerified && (
                    <LucideShieldCheck className="w-3 h-3 text-primary" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Protocol</span>
                <Badge variant="outline" className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 border-purple-500/20">
                  x402
                </Badge>
              </div>

              {/* Chain Selector */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Network</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedChain(WORLD_CHAIN_ID)}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      selectedChain === WORLD_CHAIN_ID
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl">{CHAIN_ICONS[WORLD_CHAIN_ID]}</span>
                      <span className="text-[10px] font-black">World Chain</span>
                      <span className="text-[9px] text-muted-foreground">Agent-ready</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedChain(BASE_CHAIN_ID)}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      selectedChain === BASE_CHAIN_ID
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl">{CHAIN_ICONS[BASE_CHAIN_ID]}</span>
                      <span className="text-[10px] font-black">Base</span>
                      <span className="text-[9px] text-muted-foreground">Standard</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Error */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-400 font-bold">{paymentError}</p>
              </div>
            )}

            {/* x402 Payment Requirement */}
            {x402Requirement && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-[10px] text-primary font-bold mb-1">x402 Payment Required</p>
                <div className="space-y-0.5 text-[9px] text-muted-foreground">
                  <p>Amount: {x402Requirement.amount} USDC</p>
                  <p>To: {x402Requirement.payTo?.slice(0, 10)}...</p>
                </div>
              </div>
            )}

            {/* Wallet Connection */}
            {paymentStep === 'connect' && (
              <div className="space-y-3">
                {!isConnected ? (
                  <div className="flex justify-center py-2">
                    <WorldWalletButton size='md' />
                  </div>
                ) : chain === undefined ? (
                  <div className="flex justify-center py-4">
                    <LucideLoader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !isCorrectChain ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-[10px] text-yellow-400 font-bold">
                        Switch to {CHAIN_NAMES[selectedChain]} for x402 payments
                      </p>
                    </div>
                    <Button 
                      onClick={handleSwitchChain}
                      className="w-full py-4 text-sm font-black bg-yellow-500 text-black hover:bg-yellow-400 rounded-xl"
                    >
                      <LucideWallet className="w-4 h-4 mr-2" />
                      Switch to {CHAIN_NAMES[selectedChain]}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setPaymentStep('review')}
                    className={cn(
                      'w-full py-5 text-sm font-black rounded-xl shadow-[0_0_20px_rgba(0,214,50,0.2)]',
                      selectedChain === WORLD_CHAIN_ID
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-blue-500 text-white hover:bg-blue-400'
                    )}
                  >
                    <LucideWallet className="w-4 h-4 mr-2" />
                    Continue to Pay via {CHAIN_NAMES[selectedChain]}
                  </Button>
                )}
                <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Secure x402 payment with wallet signature
                </p>
              </div>
            )}

            {/* Review & Pay */}
            {paymentStep === 'review' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-bold">
                    You'll sign a payment authorization via wallet. This enables automatic USDC transfer through the x402 protocol.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                    <LucideCheckCircle className="w-3 h-3 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                    <p className="text-[9px] text-muted-foreground">Ready for x402 payment</p>
                  </div>
                </div>

                <Button 
                  onClick={handlePay}
                  disabled={isSigning || isWagmiSigning}
                  className={cn(
                    'w-full py-5 text-sm font-black rounded-xl shadow-[0_0_20px_rgba(0,214,50,0.2)] disabled:opacity-50',
                    selectedChain === WORLD_CHAIN_ID
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  )}
                >
                  {(isSigning || isWagmiSigning) ? (
                    <>
                      <LucideLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirm on {CHAIN_NAMES[selectedChain]}...
                    </>
                  ) : (
                    <>
                      <LucideCoins className="w-4 h-4 mr-2" />
                      Pay {metadata.price} USDC on {CHAIN_NAMES[selectedChain]}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Paying State */}
            {paymentStep === 'paying' && !isConfirming && !isWagmiConfirming && !isUserOpPolling && (
              <div className="flex flex-col items-center gap-3 py-6">
                <LucideLoader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-black text-white">Processing x402 Payment...</p>
                <p className="text-xs text-muted-foreground">
                  {(isSigning || isWagmiSigning) ? 'Confirm the transaction in your wallet' : 'Initiating payment...'}
                </p>
              </div>
            )}

            {/* Confirming State (wagmi or userOp polling) */}
            {(isConfirming || isWagmiConfirming || isUserOpPolling) && !isConfirmed && (
              <div className="flex flex-col items-center gap-3 py-6">
                <LucideLoader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-black text-white">Confirming Transaction...</p>
                <p className="text-xs text-muted-foreground">
                  {isMiniApp ? 'Waiting for bundler confirmation...' : 'Waiting for on-chain confirmation'}
                </p>
              </div>
            )}

            <Link href={dealBackUrl} className="block">
              <Button variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-white text-xs">
                <LucideArrowLeft className="w-3 h-3 mr-2" /> Cancel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

// ============================================================================
// EXPORT: PaymentPageContent (wraps inner with Suspense for useSearchParams)
// ============================================================================

export default function PaymentPageContent({ id }: { id: string }) {
  return (
    <Suspense>
      <PaymentPageContentInner id={id} />
    </Suspense>
  );
}
