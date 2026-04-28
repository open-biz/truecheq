'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LucideTag,
  LucideShoppingCart,
  LucideMessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniKit } from '@worldcoin/minikit-js';
import {
  TopBar,
  VerificationBadge,
  CircularIcon,
  Tabs,
  TabItem,
  useHaptics,
} from '@worldcoin/mini-apps-ui-kit-react';

import {
  type TruCheqUser,
  saveTruCheqUser,
  loadTruCheqUser,
  migrateToUnifiedUser,
} from '@/lib/trucheq-user';
import { TruCheqAuth } from '@/components/TruCheqAuth';
import { DealCreator } from '@/components/DealCreator';
import { DealDashboard } from '@/components/DealDashboard';
import { ChatTab as ChatTabXMTP } from '@/components/ChatTab';
import { MarketTab } from '@/components/MarketTab';

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
  chatUnreadCount = 0,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  chatUnreadCount?: number;
}) {
  // Track 0→>0 transition for pulse animation
  const prevUnreadRef = useRef(chatUnreadCount);
  const haptics = useHaptics();

  useEffect(() => {
    if (prevUnreadRef.current === 0 && chatUnreadCount > 0) {
      prevUnreadRef.current = chatUnreadCount;
    }
    prevUnreadRef.current = chatUnreadCount;
  }, [chatUnreadCount]);

  const tabs: { id: TabId; icon: React.ReactNode; activeIcon: React.ReactNode; label: string }[] = [
    { id: 'sell', icon: <LucideTag className='w-5 h-5' />, activeIcon: <LucideTag className='w-5 h-5' />, label: 'Sell' },
    { id: 'buy', icon: <LucideShoppingCart className='w-5 h-5' />, activeIcon: <LucideShoppingCart className='w-5 h-5' />, label: 'Buy' },
    { id: 'chat', icon: <LucideMessageCircle className='w-5 h-5' />, activeIcon: <LucideMessageCircle className='w-5 h-5' />, label: 'Chat' },
  ];

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    haptics.impact('light');
  };

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F14] border-t border-white/10 px-0 pb-[max(env(safe-area-inset-bottom),12px)]'>
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            value={tab.id}
            icon={tab.icon}
            altIcon={tab.activeIcon}
            label={tab.label}
          />
        ))}
      </Tabs>
    </div>
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
      return;
    }
    // No stored user — land mini app on Sell view immediately with the data
    // already exposed by World App on init (no walletAuth/SIWE required for
    // read-only access, per docs.world.org MiniKit State).
    const mk = MiniKit.user;
    const walletAddress = mk?.walletAddress || (typeof window !== 'undefined' ? (window as any).WorldApp?.wallet_address : undefined);
    const isOrbVerified = mk?.verificationStatus?.isOrbVerified ?? false;
    setUser({
      nullifierHash: 'guest',
      isOrbVerified,
      verificationLevel: isOrbVerified ? 'orb' : 'device',
      walletAddress,
      truCheqCode: 'GUEST',
      createdAt: Date.now(),
    });
    if (walletAddress) {
      // Persist the address so other components (DealCreator, payments) can read it
      // via getStoredWalletAddress() without needing a SIWE prompt.
      try {
        localStorage.setItem('trucheq_wallet_auth', JSON.stringify({ address: walletAddress }));
      } catch {}
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: TruCheqUser) => {
    setUser(authenticatedUser);
    saveTruCheqUser(authenticatedUser);
  };

  if (!mounted) return null;

  // ---- Not authenticated — show auth flow ----
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F14] text-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

        <TopBar
          title="TruCheq"
          startAdornment={
            <CircularIcon size="sm">
              <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover rounded-full" />
            </CircularIcon>
          }
        />

        <div className="max-w-md mx-auto px-4 py-8">
          <TruCheqAuth onSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  // ---- Authenticated — show tabbed interface ----
  return (
    <div className="min-h-screen bg-[#0A0F14] text-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-10" />

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

      {/* Main content area with padding for bottom tabs */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
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
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} chatUnreadCount={chatUnreadCount} />
    </div>
  );
}
