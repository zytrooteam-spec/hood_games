'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HoodNavbar from '@/components/navigation/HoodNavbar';
import HoodPlayerSidebar from '@/components/navigation/HoodPlayerSidebar';
import HoodMobileBottomNav from '@/components/navigation/HoodMobileBottomNav';
import UnifiedCashierModal from '@/components/modals/UnifiedCashierModal';
import AuthModal from '@/components/modals/AuthModal';
import HoodDailySpinModal from '@/components/games/HoodDailySpinModal';
import HoodAppModal from '@/components/modals/HoodAppModal';
import HoodNotificationsModal from '@/components/modals/HoodNotificationsModal';
import FreeplayTaskModal from '@/components/modals/FreeplayTaskModal';
import { unlockAudioContext, playTune, setPlayerTouchTune } from '@/lib/soundAlerts';
import { Headphones } from 'lucide-react';
import { diffSet, areEqual } from '@/lib/fastDiff';
import { broadcastPlayerSession, subscribePlayerSession } from '@/lib/sessionClient';
import { normalizePlayerUser, fetchPlayerSession } from '@/lib/playerSession';
import { readSessionSnapshot, writeSessionSnapshot } from '@/lib/clientCache';

export const AppShellContext = createContext({
  user: null,
  sessionReady: false,
  fetchUser: () => {},
  openAuth: () => {},
  openCashier: () => {},
  openChat: () => {},
  openSpin: () => {},
  openApp: () => {},
});

export const useAppShell = () => useContext(AppShellContext);

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => readSessionSnapshot());
  const [sessionReady, setSessionReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(readSessionSnapshot());
  });

  // Global modals (Auth & Chat can still be triggered when needed, while all 9 items have dedicated pages)
  const [cashierModal, setCashierModal] = useState({ open: false, tab: 'deposit' });
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [freeplayOpen, setFreeplayOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);

  const fetchUser = async (isSilent = false) => {
    try {
      const player = await fetchPlayerSession();
      if (player) {
        diffSet(setUser, player);
        writeSessionSnapshot(player);
        return;
      }
      if (!isSilent) {
        diffSet(setUser, null);
        setUnreadNotifs(0);
        writeSessionSnapshot(null);
      }
    } catch {
      if (!isSilent && !readSessionSnapshot()) diffSet(setUser, null);
    } finally {
      setSessionReady(true);
    }
  };

  const fetchUnreadNotifs = async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.notifications) && !notifsOpen) {
        const unread = data.notifications.filter((n) => !n.read).length;
        setUnreadNotifs(unread);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    unlockAudioContext();
    fetchUser(Boolean(readSessionSnapshot()));
    fetchUnreadNotifs();
    const loadSiteSettings = () => {
      fetch('/api/admin/settings', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.settings) {
            setSiteSettings(d.settings);
            if (d.settings.playerTouchTune) setPlayerTouchTune(d.settings.playerTouchTune);
          }
        })
        .catch(() => {});
    };
    loadSiteSettings();
    const onInstant = () => {
      fetchUser(true);
      fetchUnreadNotifs();
    };
    window.addEventListener('hood-instant-sync', onInstant);
    window.addEventListener('balanceUpdate', onInstant);
    // SSE first; gentle backup poll when tab visible
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchUser(true);
      fetchUnreadNotifs();
    }, 45000);

    const handleUserSync = (e) => {
      if (e?.detail) {
        const player = normalizePlayerUser(e.detail);
        diffSet(setUser, player);
        writeSessionSnapshot(player);
      } else {
        writeSessionSnapshot(null);
        fetchUser(true);
      }
    };
    window.addEventListener('user-sync', handleUserSync);
    window.addEventListener('hood-user-sync', handleUserSync);
    const unsubPlayer = subscribePlayerSession((detail) => {
      if (detail === undefined) fetchUser(true);
      else {
        const player = normalizePlayerUser(detail);
        diffSet(setUser, player);
        writeSessionSnapshot(player);
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('hood-instant-sync', onInstant);
      window.removeEventListener('balanceUpdate', onInstant);
      window.removeEventListener('user-sync', handleUserSync);
      window.removeEventListener('hood-user-sync', handleUserSync);
      unsubPlayer();
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isAdminLogout: false }),
    });
    diffSet(setUser, null);
    writeSessionSnapshot(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
      window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
      broadcastPlayerSession(null);
    }
    playTune('click');
    router.push('/');
  };

  const contextValue = {
    user,
    sessionReady,
    fetchUser,
    openAuth: (tab) => setAuthModal({ open: true, tab: tab || 'login' }),
    openCashier: (tab) => router.push('/wallet'),
    openChat: () => router.push('/chat'),
    openSpin: () => router.push('/wheel-spin'),
    openApp: () => router.push('/download-app'),
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#0a1628] text-slate-100 flex flex-col">
        {/* 1. Player Navigation Sidebar with All Handwritten Items Navigating to Dedicated Routes */}
        <HoodPlayerSidebar
          user={user}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          onOpenCashier={() => router.push('/wallet')}
          onOpenSpinWheel={() => router.push('/wheel-spin')}
          onOpenApp={() => router.push('/download-app')}
          onOpenChat={() => router.push('/chat')}
          onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
          onLogout={handleLogout}
        />

        {/* Main Page Layout Wrapper */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          {/* Top Navbar */}
          <HoodNavbar
            user={user}
            sessionReady={sessionReady}
            unreadNotifications={unreadNotifs}
            onOpenNotifications={() => setNotifsOpen(true)}
            onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
            onOpenCashier={() => router.push('/wallet')}
            onOpenSpinWheel={() => router.push('/wheel-spin')}
            onOpenChat={() => router.push('/chat')}
            onOpenApp={() => router.push('/download-app')}
            onLogout={handleLogout}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            onOpenFreeplay={() => {
              if (user) setFreeplayOpen(true);
              else setAuthModal({ open: true, tab: 'register' });
            }}
          />

          {/* Content Children */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
            {typeof children === 'function' ? children(contextValue) : children}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-[#1a3363] bg-[#09142a] py-8 text-center text-xs text-gray-400">
            <div className="max-w-7xl mx-auto px-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="font-black text-white text-sm">HOOD GAMES</span>
                <span>•</span>
                <span>Official Sweepstakes Concierge</span>
              </div>
              <p className="text-[11px] text-gray-500 max-w-xl mx-auto">
                NO PURCHASE NECESSARY TO ENTER OR WIN. Sweepstakes are void where prohibited by law. 18+ only.
              </p>
              <p className="text-[10px] text-gray-600">
                © 2026 Hood Games Inc. All rights reserved.
              </p>
            </div>
          </footer>
        </div>

        {/* Mobile Bottom Navigation */}
        <HoodMobileBottomNav
          sidebarOpen={mobileSidebarOpen}
          onOpenCashier={() => router.push('/wallet')}
          onOpenApp={() => router.push('/download-app')}
          onOpenChat={() => router.push('/chat')}
        />

        {/* Floating Support Chat Trigger for Desktop */}
        <button
          type="button"
          onClick={() => {
            router.push('/chat');
            playTune('click');
          }}
          className="hidden md:flex fixed bottom-6 right-6 z-40 p-4 rounded-full btn-hood-green text-white shadow-[0_6px_25px_rgba(44,182,78,0.5)] items-center gap-2 hover:scale-105 transition-transform"
          title="Live Support Chat"
        >
          <Headphones size={20} />
          <span className="text-xs font-black uppercase tracking-wider">Live Concierge</span>
        </button>

        {/* Global Modals for Auth and Live Chat */}
        <AuthModal
          isOpen={authModal.open}
          initialTab={authModal.tab}
          onClose={() => setAuthModal({ open: false, tab: 'login' })}
          onOpenCashier={(tab) => {
            router.push(`/wallet?tab=${encodeURIComponent(tab || 'withdraw')}`);
          }}
          onSuccess={(u) => {
            const player = normalizePlayerUser(u);
            if (player) {
              diffSet(setUser, player);
              writeSessionSnapshot(player);
            }
            fetchUser(true);
          }}
        />

        <HoodNotificationsModal
          isOpen={notifsOpen}
          onClose={() => setNotifsOpen(false)}
          user={user}
          onAllRead={() => setUnreadNotifs(0)}
        />

        <FreeplayTaskModal
          isOpen={freeplayOpen}
          onClose={() => setFreeplayOpen(false)}
          user={user}
          freeplayAmount={Number(siteSettings?.freeplayAmountSC ?? 5)}
          onSuccess={() => fetchUser(true)}
        />
      </div>
    </AppShellContext.Provider>
  );
}
