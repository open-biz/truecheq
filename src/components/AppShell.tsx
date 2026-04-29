'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniKit } from '@worldcoin/minikit-js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  MessageCircle,
  User,
  LogOut,
  Copy,
  Info,
  Wallet,
  ShieldCheck,
  Smartphone,
  AlertCircle,
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
import { ConnectButton } from '@/components/ConnectButton';
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
      className='fixed left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl bottom-0 shadow-[0_-1px_0_rgba(255,255,255,0.06),0_-4px_24px_rgba(0,0,0,0.4)]'
      role="tablist"
      aria-label="Main navigation"
    >
      {/* Tab buttons */}
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
                'flex-1 flex flex-col items-center gap-1.5 py-5 transition-colors relative',
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

      {/* Safe area spacer — separates tabs from iOS home indicator */}
      <div
        className='bg-background/95'
        style={{ height: 'max(8px, env(safe-area-inset-bottom))' }}
      />
    </nav>
  );
}

// ============================================================================
// Component: Standalone Header
// ============================================================================

function StandaloneHeader({ user, onLogout }: { user: TruCheqUser; onLogout: () => void }) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
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
            <div className={cn(
              'w-2 h-2 rounded-full',
              user.verificationLevel === 'orb' ? 'bg-primary' :
              user.verificationLevel === 'device' ? 'bg-blue-400' :
              'bg-white/30'
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {user.verificationLevel === 'orb' ? 'Orb' :
               user.verificationLevel === 'device' ? 'Device' :
               'Wallet'}
            </span>
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-50 w-52 rounded-2xl bg-card overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
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
                        // toast not available here — just copy silently
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
                  <a
                    href="/about"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors w-full"
                  >
                    <Info className="w-4 h-4 text-white/40" />
                    About TruCheq
                  </a>
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
// Component: Guest Profile (standalone browser — not authenticated)
// ============================================================================

function GuestProfile() {
  const { login } = useAuth();
  const isMiniApp = MiniKit.isInstalled();

  return (
    <div className="space-y-5">
      {/* Identity Card */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center bg-white/[0.06]">
            <Wallet className="w-6 h-6 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white tracking-tight">Guest</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/[0.06] border-white/[0.08]">
              <AlertCircle className="w-4 h-4" />
              Not Verified
            </div>
          </div>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Connect your wallet to create listings, chat with sellers, and verify your identity with World ID.
        </p>
      </div>

      {/* What you get */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Get Started</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-black text-white">World ID Verification</p>
              <p className="text-[10px] text-white/40">Prove you're human — trust badge on listings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-black text-white">Encrypted Chat</p>
              <p className="text-[10px] text-white/40">XMTP messaging with sellers & buyers</p>
            </div>
          </div>
        </div>

        {isMiniApp ? (
          <Button
            onClick={login}
            className="w-full rounded-xl bg-primary text-primary-foreground font-black h-12 text-sm shadow-[0_4px_16px_rgba(0,214,50,0.3)] transition-all active:scale-[0.98] mt-4"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Sign in with World ID
          </Button>
        ) : (
          <p className="text-[10px] text-white/30 mt-4 text-center">
            Connect your wallet from the header to get started
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN: AppShell
// ============================================================================

export function AppShell({ initialTab = 'feed' }: AppShellProps) {
  const { user, isReady, isMiniApp, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [startChatWith, setStartChatWith] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
  };

  // Wait for auth restore + auto-auth attempt to complete before rendering
  if (!isReady) return null;

  // ---- Not authenticated — Guest mode: all tabs accessible with inline prompts ----
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className='flex items-center gap-2.5'>
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-[0_0_12px_rgba(0,214,50,0.1)]">
                  <img src="/trucheq-logo.jpeg" alt="TruCheq" className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-black tracking-tighter italic text-white">TruCheq</span>
              </div>
              <ConnectButton variant="compact" />
            </div>
          </header>
        )}

        <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
          {activeTab === 'feed' && (
            <FeedTab
              guestMode
              onRequireAuth={() => setActiveTab('feed')}
              onChatSeller={(addr: string) => { setStartChatWith(addr); setActiveTab('chat'); }}
            />
          )}
          {activeTab === 'chat' && (
            <ChatTab
              onUnreadChange={setChatUnreadCount}
              startChatWith={startChatWith}
              onChatStarted={() => setStartChatWith(null)}
            />
          )}
          {activeTab === 'profile' && <GuestProfile />}
        </div>

        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} isMiniApp={isMiniApp} chatUnreadCount={chatUnreadCount} />
      </div>
    );
  }

  // ---- Authenticated — show tabbed interface ----
  return (
    <div className="min-h-screen bg-background text-foreground">
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

      <div className="max-w-lg mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
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
