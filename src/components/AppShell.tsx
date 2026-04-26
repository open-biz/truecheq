'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMiniApp } from '@/lib/use-mini-app';
import { useAccount, useDisconnect } from 'wagmi';
import {
  LucideTag,
  LucideShoppingCart,
  LucideMessageCircle,
  LucideShieldCheck,
  LucideSmartphone,
  LucideWallet,
  LucideLogOut,
  LucideCopy,
  LucideChevronDown,
  LucideGlobe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TopBar,
  VerificationBadge,
  CircularIcon,
} from '@worldcoin/mini-apps-ui-kit-react';

import {
  type TruCheqUser,
  saveTruCheqUser,
  clearTruCheqUser,
  loadTruCheqUser,
  migrateToUnifiedUser,
} from '@/lib/trucheq-user';
import { TruCheqAuth } from '@/components/TruCheqAuth';
import { DealCreator } from '@/components/DealCreator';
import { DealDashboard } from '@/components/DealDashboard';
import { ChatTab as ChatTabXMTP } from '@/components/ChatTab';
import { MarketTab } from '@/components/MarketTab';
import { toast } from 'sonner';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

type TabId = 'sell' | 'buy' | 'chat';

interface AppShellProps {
  /** Initial tab to show */
  initialTab?: TabId;
}

// ============================================================================
// Component: Bottom Tab Bar
// ============================================================================

function BottomTabBar({
  activeTab,
  onTabChange,
  isMiniApp,
  chatUnreadCount = 0,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isMiniApp: boolean;
  chatUnreadCount?: number;
}) {
  // Track 0→>0 transition for pulse animation
  const prevUnreadRef = useRef(chatUnreadCount);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (prevUnreadRef.current === 0 && chatUnreadCount > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2000);
      prevUnreadRef.current = chatUnreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = chatUnreadCount;
  }, [chatUnreadCount]);

  const tabs: { id: TabId; icon: typeof LucideTag; label: string }[] = [
    { id: 'sell', icon: LucideTag, label: 'Sell' },
    { id: 'buy', icon: LucideShoppingCart, label: 'Buy' },
    { id: 'chat', icon: LucideMessageCircle, label: 'Chat' },
  ];

  return (
    <nav
      className={cn(
        'fixed left-0 right-0 z-50 border-t border-white/5 bg-black/80 backdrop-blur-xl',
        isMiniApp ? 'bottom-[var(--world-nav-height)]' : 'bottom-0',
      )}
      role="tablist"
      aria-label="Main navigation"
    >
        <LayoutGroup>
          <div className="max-w-lg mx-auto flex items-center">
            {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-white/70',
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(0,214,50,0.5)]')} />
                {/* Unread badge on Chat tab — animated notification style */}
                <AnimatePresence>
                  {tab.id === 'chat' && chatUnreadCount > 0 && !isActive && (
                    <motion.div
                      key='chat-badge'
                      initial={{ scale: 0, opacity: 0 }}
                      animate={
                        isPulsing
                          ? { scale: [1, 1.3, 1, 1.3, 1, 1.3, 1], opacity: [1, 0.8, 1, 0.8, 1, 0.8, 1] }
                          : { scale: 1, opacity: 1 }
                      }
                      exit={{ scale: 0, opacity: 0 }}
                      transition={
                        isPulsing
                          ? { duration: 1.8, ease: 'easeInOut' }
                          : { type: 'spring', stiffness: 500, damping: 25 }
                      }
                      className={cn(
                        chatUnreadCount === 1
                          ? 'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border border-[#0A0F14]'
                          : 'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary border-2 border-[#0A0F14] flex items-center justify-center px-1',
                      )}
                      style={{
                        boxShadow: isPulsing
                          ? '0 0 12px rgba(0,214,50,0.8), 0 0 24px rgba(0,214,50,0.4)'
                          : '0 0 6px rgba(0,214,50,0.6)',
                      }}
                    >
                      {chatUnreadCount > 1 && (
                        <span className='text-[9px] font-black text-primary-foreground leading-none'>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-1 h-4 rounded-full bg-primary shadow-[0_0_8px_rgba(0,214,50,0.6)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          );
            })}
          </div>
        </LayoutGroup>
    </nav>
  );
}

// ============================================================================
// Component: Standalone Header
// ============================================================================

function StandaloneHeader({
  user,
  onLogout,
}: {
  user: TruCheqUser;
  onLogout: () => void;
}) {
  const { address } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);

  const walletAddr = user.walletAddress || address;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
            <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
        </Link>

        {/* Identity Chip */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                user.isOrbVerified ? 'bg-primary' : 'bg-blue-400',
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {user.isOrbVerified ? 'Orb' : 'Device'}
            </span>
            {walletAddr && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {walletAddr.slice(0, 4)}...{walletAddr.slice(-4)}
              </span>
            )}
            <LucideChevronDown
              className={cn('w-3 h-3 text-muted-foreground transition-transform', showDropdown && 'rotate-180')}
            />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden shadow-2xl"
              >
                {/* Verification */}
                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    {user.isOrbVerified ? (
                      <LucideShieldCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <LucideSmartphone className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-xs font-black uppercase tracking-widest">
                      {user.isOrbVerified ? 'Orb Verified' : 'Device Verified'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    Code: {user.truCheqCode}
                  </p>
                </div>

                {/* Wallet */}
                {walletAddr && (
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <LucideWallet className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-white/70 truncate flex-1">
                        {walletAddr}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(walletAddr);
                          toast.success('Address copied!');
                        }}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        <LucideCopy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-2">
                  <Link
                    href="/about"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LucideGlobe className="w-3 h-3" />
                    About TruCheq
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LucideLogOut className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click outside to close */}
      {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}
    </header>
  );
}

// ============================================================================
// Component: Sell Tab
// ============================================================================

function SellTab({ user }: { user: TruCheqUser }) {
  const [view, setView] = useState<'create' | 'dashboard'>('create');
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
        <Button
          variant={view === 'create' ? 'secondary' : 'ghost'}
          onClick={() => setView('create')}
          className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest"
        >
          <LucideTag className="w-3 h-3 mr-1.5" />
          Create
        </Button>
        <Button
          variant={view === 'dashboard' ? 'secondary' : 'ghost'}
          onClick={() => setView('dashboard')}
          className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest"
        >
          My Listings
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {view === 'create' ? (
            <DealCreator isOrbVerified={user.isOrbVerified} walletAddress={user.walletAddress} />
          ) : (
            <DealDashboard />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN: AppShell
// ============================================================================

export function AppShell({ initialTab = 'sell' }: AppShellProps) {
  const isMiniApp = useIsMiniApp();
  const { disconnect } = useDisconnect();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [user, setUser] = useState<TruCheqUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Try to restore user from storage or migrate from old format
    const existing = loadTruCheqUser() || migrateToUnifiedUser();
    if (existing) {
      setUser(existing);
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: TruCheqUser) => {
    setUser(authenticatedUser);
    saveTruCheqUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    clearTruCheqUser();
    disconnect();
    toast.success('Signed out');
  };

  if (!mounted) return null;

  // ---- Not authenticated — show auth flow ----
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F14] text-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

        {/* Mini App: World App TopBar. Standalone: custom header */}
        {isMiniApp ? (
          <TopBar
            title="TruCheq"
            startAdornment={
              <CircularIcon size="sm">
                <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover rounded-full" />
              </CircularIcon>
            }
          />
        ) : (
          <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-md">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                  <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
              </div>
              <Link href="/about">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">
                  About
                </Button>
              </Link>
            </div>
          </header>
        )}

        <div className="max-w-md mx-auto px-4 py-8">
          <TruCheqAuth
            onSuccess={handleAuthSuccess}
            skipWalletStep={isMiniApp}
          />
        </div>
      </div>
    );
  }

  // ---- Authenticated — show tabbed interface ----
  return (
    <div className="min-h-screen bg-[#0A0F14] text-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

      {/* Header: Mini App gets TopBar with native VerificationBadge, standalone gets custom header */}
      {isMiniApp ? (
        <TopBar
          title="TruCheq"
          startAdornment={
            <CircularIcon size="sm">
              <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover rounded-full" />
            </CircularIcon>
          }
          endAdornment={
            <VerificationBadge verified={user.isOrbVerified} />
          }
        />
      ) : (
        <StandaloneHeader user={user} onLogout={handleLogout} />
      )}

      {/* Main content area with padding for bottom tabs */}
      <div className={cn('max-w-lg mx-auto px-4 pt-4 pb-24', !isMiniApp && 'pt-4')}>
        {/* ChatTab: always mounted (hidden when inactive) so XMTP syncs in background */}
        <div className={cn(activeTab !== 'chat' && 'hidden')}>
          <motion.div
            initial={false}
            animate={{ opacity: activeTab === 'chat' ? 1 : 0, y: activeTab === 'chat' ? 0 : 8 }}
            transition={{ duration: 0.15 }}
          >
            <ChatTabXMTP onUnreadChange={setChatUnreadCount} />
          </motion.div>
        </div>

        {/* Other tabs with animation */}
        {activeTab !== 'chat' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'sell' && <SellTab user={user} />}
              {activeTab === 'buy' && <MarketTab />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} isMiniApp={isMiniApp} chatUnreadCount={chatUnreadCount} />
    </div>
  );
}
