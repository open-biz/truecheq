'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  MessageCircle,
  User,
  LogOut,
  Copy,
  Info,
} from 'lucide-react';
import {
  TopBar,
  CircularIcon,
  BottomBar,
  Tabs,
  TabItem,
  useHaptics,
} from '@worldcoin/mini-apps-ui-kit-react';

import { type TruCheqUser } from '@/lib/trucheq-user';
import { useAuth } from '@/lib/auth-provider';
import { TruCheqAuth } from '@/components/TruCheqAuth';
import { ChatTab } from '@/components/ChatTab';
import { FeedTab } from '@/components/FeedTab';
import { ProfileTab } from '@/components/ProfileTab';

// ============================================================================
// Types
// ============================================================================

type TabId = 'feed' | 'chat' | 'profile';

interface AppShellProps {
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
  const haptics = useHaptics();

  const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'feed', icon: <LayoutGrid className='w-6 h-6' />, label: 'Feed' },
    { id: 'chat', icon: <MessageCircle className='w-6 h-6' />, label: 'Chat' },
    { id: 'profile', icon: <User className='w-6 h-6' />, label: 'Profile' },
  ];

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    if (isMiniApp) haptics.impact('light');
  };

  if (isMiniApp) {
    return (
      <div className='fixed left-0 right-0 z-50 bottom-[var(--world-nav-height)]'>
        <BottomBar direction='horizontal'>
          <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)}>
            {tabs.map((tab) => (
              <TabItem
                key={tab.id}
                value={tab.id}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </Tabs>
        </BottomBar>
      </div>
    );
  }

  return (
    <nav
      className='fixed left-0 right-0 z-50 bg-[#070709]/95 backdrop-blur-2xl bottom-0 shadow-[0_-1px_0_rgba(255,255,255,0.06),0_-4px_24px_rgba(0,0,0,0.4)]'
      role="tablist"
      aria-label="Main navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1.5 py-4 transition-colors relative',
                isActive ? 'text-primary' : 'text-white/40 hover:text-white/70',
              )}
            >
              <div className="relative">
                {tab.icon}
                {tab.id === 'chat' && chatUnreadCount > 0 && !isActive && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[9px] font-black flex items-center justify-center text-primary-foreground shadow-[0_0_8px_rgba(0,214,50,0.4)]">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary shadow-[0_0_8px_rgba(0,214,50,0.6)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================================
// Component: Standalone Header
// ============================================================================

function StandaloneHeader({ user, onLogout }: { user: TruCheqUser; onLogout: () => void }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#070709]/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(0,214,50,0.1)]">
            <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
          >
            <div className={cn('w-2 h-2 rounded-full', user.isOrbVerified ? 'bg-primary' : 'bg-blue-400')} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {user.isOrbVerified ? 'Orb' : 'Device'}
            </span>
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl bg-[#16161A] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                {/* Code Section */}
                <div className="p-4 pb-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-1.5">Your TruCheq Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-white/80">{user.truCheqCode}</code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(user.truCheqCode);
                        toast.success('Code copied');
                      }}
                      className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06] mx-4" />

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    href="/about"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors w-full"
                  >
                    <Info className="w-4 h-4 text-white/40" />
                    About TruCheq
                  </Link>
                </div>

                <div className="h-px bg-white/[0.06] mx-4" />

                {/* Sign Out */}
                <div className="p-2">
                  <button
                    onClick={() => { setShowDropdown(false); onLogout(); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// MAIN: AppShell
// ============================================================================

export function AppShell({ initialTab = 'feed' }: AppShellProps) {
  const { user, isReady, isMiniApp, login, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [startChatWith, setStartChatWith] = useState<string | null>(null);

  const handleAuthSuccess = (authenticatedUser: TruCheqUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    logout();
  };

  // Wait for auth restore + auto-auth attempt to complete before rendering
  if (!isReady) return null;

  // ---- Not authenticated — Guest mode: show feed, auth overlay for actions ----
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070709] text-foreground">
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-[0.08] z-0" />

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
          <header className="sticky top-0 z-40 bg-[#070709]/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className='flex items-center gap-2.5'>
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(0,214,50,0.1)]">
                  <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
              </div>
            </div>
          </header>
        )}

        <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
          <FeedTab
            guestMode
            onRequireAuth={() => setActiveTab('feed')}
            onChatSeller={(addr: string) => { setStartChatWith(addr); setActiveTab('chat'); }}
          />
        </div>

        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} isMiniApp={isMiniApp} chatUnreadCount={chatUnreadCount} />

        {/* Auth overlay — standalone browser only. Inside World App, AuthProvider auto-runs walletAuth. */}
        {!isMiniApp && activeTab !== 'feed' && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <TruCheqAuth onSuccess={handleAuthSuccess} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Authenticated — show tabbed interface ----
  return (
    <div className="min-h-screen bg-[#070709] text-foreground">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-[0.08] z-0" />

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
        <StandaloneHeader user={user} onLogout={handleLogout} />
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        <div className={cn(activeTab !== 'chat' && 'hidden')}>
          <motion.div
            initial={false}
            animate={{ opacity: activeTab === 'chat' ? 1 : 0, y: activeTab === 'chat' ? 0 : 8 }}
            transition={{ duration: 0.15 }}
          >
            <ChatTab
              onUnreadChange={setChatUnreadCount}
              startChatWith={startChatWith}
              onChatStarted={() => setStartChatWith(null)}
              onRequireAuth={login}
            />
          </motion.div>
        </div>

        {activeTab !== 'chat' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'feed' && (
                <FeedTab
                  user={user}
                  onChatSeller={(addr: string) => { setStartChatWith(addr); setActiveTab('chat'); }}
                />
              )}
              {activeTab === 'profile' && <ProfileTab user={user} onLogout={handleLogout} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} isMiniApp={isMiniApp} chatUnreadCount={chatUnreadCount} />

    </div>
  );
}
