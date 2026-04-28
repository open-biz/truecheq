'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMiniApp } from '@/lib/use-mini-app';
import { cn } from '@/lib/utils';
import {
  LucideTag,
  LucideShoppingCart,
  LucideMessageCircle,
  LucideExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TopBar,
  VerificationBadge,
  CircularIcon,
  BottomBar,
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
    <div className='fixed left-0 right-0 z-50 bottom-[var(--world-nav-height)]'>
      <BottomBar direction='horizontal'>
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
      </BottomBar>
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
  const isMiniApp = useIsMiniApp();
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
    } else {
      // TEMP: skip auth gate — land mini app directly on Sell view with a guest user
      setUser({
        nullifierHash: 'guest',
        isOrbVerified: false,
        verificationLevel: 'device',
        truCheqCode: 'GUEST',
        createdAt: Date.now(),
      });
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: TruCheqUser) => {
    setUser(authenticatedUser);
    saveTruCheqUser(authenticatedUser);
  };

  if (!mounted) return null;
  if (!isMiniApp) {
    return (
      <div className="min-h-screen bg-[#0A0F14] text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 text-center space-y-4">
          <p className="text-sm font-black uppercase tracking-widest text-primary">Mini App Only</p>
          <h1 className="text-2xl font-black tracking-tight">Open TruCheq in World App</h1>
          <p className="text-sm text-muted-foreground">
            This build is configured for World App webview only.
          </p>
          <p className="text-xs text-muted-foreground">
            Open this URL inside World App to use TruCheq.
          </p>
        </div>
      </div>
    );
  }

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
