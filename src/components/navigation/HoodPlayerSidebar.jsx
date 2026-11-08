'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Key,
  Wallet,
  Crown,
  Users,
  Gift,
  Coins,
  Download,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HoodPlayerSidebar({
  user,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  logoUrl = '/logo.png',
  onOpenCashier,
  onOpenSpinWheel,
  onOpenApp,
  onOpenChat,
  onOpenAuth,
  onLogout,
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Exactly matching the user's handwritten list:
  // 1. Home
  // 2. Games
  // 3. Game Id
  // 4. Deposit / Redeem
  // 5. VIP Privilege 👑
  // 6. Refer and Earn
  // 7. Wheel Spin
  // 8. Cashback
  // 9. Download App
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      id: 'games',
      label: 'Games',
      icon: Gamepad2,
      path: '/games',
      badge: 'HOT',
    },
    {
      id: 'game-ids',
      label: 'Game Id',
      icon: Key,
      path: '/game-ids',
      badge: 'PIN',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    },
    {
      id: 'deposit-redeem',
      label: 'Deposit / Redeem',
      icon: Wallet,
      path: '/wallet',
      highlight: true,
      badge: '1-TAP',
    },
    {
      id: 'vip',
      label: 'VIP Privilege',
      icon: Crown,
      path: '/vip',
      isCrown: true,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'referral',
      label: 'Refer and Earn',
      icon: Users,
      path: '/referral',
      badge: '20%',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      id: 'wheel-spin',
      label: 'Wheel Spin',
      icon: Gift,
      path: '/wheel-spin',
      glow: true,
    },
    {
      id: 'cashback',
      label: 'Cashback',
      icon: Coins,
      path: '/cashback',
      badge: '10% NET',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'download-app',
      label: 'Download App',
      icon: Download,
      path: '/download-app',
    },
  ];

  const handleNav = (path) => {
    playTune('click');
    setMobileOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-[60] bg-[#09142a]/95 backdrop-blur-xl border-r border-[#1a3363] flex flex-col min-h-0 transition-all duration-300 h-[100dvh] max-h-[100dvh] ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        }}
      >
        {/* Top Section: Brand & Nav Links */}
        <div className="space-y-2.5 flex flex-col min-h-0 flex-1">
          {/* Header Brand */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1a3363]/80 shrink-0">
            <div
              onClick={() => handleNav('/')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden"
            >
              <div className="relative w-11 h-11 shrink-0 rounded-2xl overflow-hidden border-2 border-[#2cb64e]/50 shadow-[0_0_18px_rgba(44,182,78,0.35)] bg-[#070d1e] flex items-center justify-center">
                {logoUrl?.startsWith('data:image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Hood Games Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Image
                    src={logoUrl || '/logo.png'}
                    alt="Hood Games Logo"
                    fill
                    sizes="44px"
                    className="object-contain p-1"
                    priority
                  />
                )}
              </div>

              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col">
                  <span className="font-heading font-black text-sm tracking-wider leading-tight text-white flex items-center gap-1">
                    HOOD <span className="text-[#2cb64e]">GAMES</span>
                  </span>
                  <span className="text-[9.5px] tracking-widest text-gray-400 font-bold uppercase">
                    VIP Sweeps Hub
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-400 hover:text-[#2cb64e] hover:border-[#2cb64e]/50 transition-all"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex lg:hidden items-center justify-center w-8 h-8 rounded-xl bg-[#070d1e] text-gray-400 hover:text-white border border-[#1a3363]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Online Status Pill */}
          {(!collapsed || mobileOpen) && (
            <div className="px-4 shrink-0">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#070d1e]/80 border border-[#1a3363] text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2cb64e] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2cb64e]" />
                  </span>
                  <span className="text-gray-300 font-mono text-[11px] font-bold">1,940 PLAYERS</span>
                </div>
                <span className="text-[10px] font-black text-[#2cb64e]">ONLINE</span>
              </div>
            </div>
          )}

          {/* User Quick Card (if logged in) */}
          {user && (!collapsed || mobileOpen) && (
            <div className="px-4 shrink-0">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#12244c] to-[#070d1e] border border-[#2cb64e]/40 shadow-inner flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-xs font-black text-[#2cb64e]">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-tight">{user.username}</p>
                    <span className="text-[9px] font-bold text-[#2cb64e] uppercase flex items-center gap-1">
                      👑 VIP Member
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#2cb64e] font-mono">
                  ${Number(user.balanceSC || 0).toFixed(2)} SC
                </span>
              </div>
            </div>
          )}

          {/* Navigation Items (Scrollable if needed) */}
          <div className="px-3 space-y-1 overflow-y-auto flex-1 min-h-0 overscroll-contain">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <div
                  key={item.id}
                  onClick={() => handleNav(item.path)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                    isActive
                      ? 'btn-hood-green text-white shadow-[0_4px_18px_rgba(44,182,78,0.35)]'
                      : item.highlight
                      ? 'bg-[#12244c] text-white border border-[#2cb64e]/50 hover:bg-[#1a3363]'
                      : 'text-gray-300 hover:text-white hover:bg-[#0c1b38] border border-transparent hover:border-[#1a3363]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-black/20 text-white'
                        : item.isCrown
                        ? 'bg-amber-500/20 text-amber-300'
                        : item.highlight
                        ? 'bg-[#2cb64e]/20 text-[#2cb64e]'
                        : 'bg-[#070d1e] text-gray-400 group-hover:text-[#2cb64e]'
                    }`}
                  >
                    <Icon size={17} className={item.isCrown ? 'text-amber-300 fill-amber-400/20' : ''} />
                  </div>

                  {(!collapsed || mobileOpen) && (
                    <div className="flex items-center justify-between flex-1 overflow-hidden">
                      <span className="truncate flex items-center gap-1.5">
                        {item.label}
                        {item.isCrown && <span className="text-amber-400 text-xs">👑</span>}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${
                            item.badgeClass ||
                            'bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.glow && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          FREE
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Deposit CTA — inside scroll column on mobile so it is never clipped by bottom nav */}
          <div className="px-3 pt-2 pb-1 shrink-0 space-y-1.5 lg:hidden">
            <button
              type="button"
              onClick={() => handleNav('/wallet')}
              className="w-full btn-hood-green py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Wallet size={14} />
              <span>Deposit / Redeem</span>
            </button>
          </div>
        </div>

        {/* Bottom Deposit CTA Bar (desktop / collapsed sidebar) */}
        <div className="hidden lg:block p-3 border-t border-[#1a3363]/80 bg-[#070d1e]/50 shrink-0 space-y-1.5">
          {(!collapsed || mobileOpen) ? (
            <>
              <button
                type="button"
                onClick={() => handleNav('/wallet')}
                className="w-full btn-hood-green py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                <Wallet size={14} />
                <span>Deposit / Redeem</span>
              </button>

              <div className="text-[9.5px] text-center text-gray-500 font-mono">
                HOOD GAMES • USA 2026
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleNav('/wallet')}
                className="w-10 h-10 rounded-xl btn-hood-green flex items-center justify-center shadow-lg"
                title="Deposit / Redeem"
              >
                <Wallet size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
