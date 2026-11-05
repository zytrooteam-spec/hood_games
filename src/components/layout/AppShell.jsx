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
import { unlockAudioContext } from '@/lib/soundAlerts';
import { Headphones } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import { diffSet, areEqual } from '@/lib/fastDiff';

export const AppShellContext = createContext({
  user: null,
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
  const [user, setUser] = useState(null);

  // Global modals (Auth & Chat can still be triggered when needed, while all 9 items have dedicated pages)
  const [cashierModal, setCashierModal] = useState({ open: false, tab: 'deposit' });
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' });
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchUser = async (isSilent = false) => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data?.success && data?.user) {
        diffSet(setUser, data.user);
      } else {
        diffSet(setUser, null);
        setUnreadNotifs(0);
      }
    } catch {
      if (!isSilent) diffSet(setUser, null);
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
    fetchUser();
    fetchUnreadNotifs();
    // Silent background poll every 6s so balance & status stay in sync without flicker
    const interval = setInterval(() => {
      fetchUser(true);
      fetchUnreadNotifs();
    }, 6000);

    const handleUserSync = (e) => {
      if (e?.detail) {
        diffSet(setUser, e.detail);
      } else {
        fetchUser(true);
      }
    };
    window.addEventListener('user-sync', handleUserSync);
    window.addEventListener('hood-user-sync', handleUserSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('user-sync', handleUserSync);
      window.removeEventListener('hood-user-sync', handleUserSync);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    diffSet(setUser, null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
      window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
    }
    playTune('click');
    router.push('/');
  };

  const contextValue = {
    user,
    fetchUser,
    openAuth: (tab) => setAuthModal({ open: true, tab: tab || 'login' }),
    openCashier: (tab) => router.push('/wallet'),
    openChat: () => router.push('/chat'),
    openSpin: () => router.push('/wheel-spin'),
    openApp: () => router.push('/download-app'),
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col">
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
            unreadNotifications={unreadNotifs}
            onOpenNotifications={() => setNotifsOpen(true)}
            onOpenAuth={(tab) => setAuthModal({ open: true, tab })}
            onOpenCashier={() => router.push('/wallet')}
            onOpenSpinWheel={() => router.push('/wheel-spin')}
            onOpenChat={() => router.push('/chat')}
            onOpenApp={() => router.push('/download-app')}
            onLogout={handleLogout}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
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
          onSuccess={(u) => {
            setUser(u);
            fetchUser();
          }}
        />

        <HoodNotificationsModal
          isOpen={notifsOpen}
          onClose={() => setNotifsOpen(false)}
          user={user}
          onAllRead={() => setUnreadNotifs(0)}
        />
      </div>
    </AppShellContext.Provider>
  );
}
