'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  User,
  LogOut,
  Bell,
  MessageSquare,
  Menu,
  Coins
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HoodNavbar({
  user,
  unreadNotifications = 0,
  onOpenNotifications,
  onOpenAuth,
  onOpenCashier,
  onOpenSpinWheel,
  onOpenChat,
  onOpenApp,
  onLogout,
  activeView,
  setActiveView,
  onToggleSidebar,
}) {
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#09142a]/95 backdrop-blur-xl border-b border-[#1a3363] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-nowrap items-center justify-between gap-2 sm:gap-3 min-h-[52px]">
        {/* Left: hamburger (mobile) + Cashback pill (desktop) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          {/* Hamburger Menu: Visible ONLY on mobile/tablet (lg:hidden), NEVER on desktop */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex lg:hidden items-center justify-center p-2.5 rounded-xl bg-[#070d1e] border border-[#1a3363] text-gray-200 hover:text-white hover:border-[#2cb64e]/50 transition-all shadow-sm"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>

          <nav className="hidden lg:flex items-center">
            <Link
              href="/cashback"
              onClick={() => playTune('click')}
              className="px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-300 hover:bg-[#0c1b38] flex items-center gap-2 transition-all border border-emerald-500/25 hover:border-emerald-500/50 whitespace-nowrap"
            >
              <Coins size={15} className="text-emerald-400 shrink-0" />
              <span>Cashback</span>
            </Link>
          </nav>
        </div>

        {/* Right: balance, wallet, alerts — same row, no wrap */}
        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0 ml-auto">
          {user ? (
            <>
              {/* User Sweeps Balance Pill */}
              <div
                onClick={() => {
                  onOpenCashier('deposit');
                  playTune('click');
                }}
                className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-[#070d1e] border border-[#1a3363] hover:border-[#2cb64e]/50 cursor-pointer transition-all shadow-inner max-w-[11.5rem] sm:max-w-none min-w-0"
                title="Click to Open Wallet"
              >
                <div className="flex flex-col text-right min-w-0 flex-1">
                  <span className="text-[8px] sm:text-[9.5px] uppercase font-bold text-gray-400 truncate">
                    Sweeps Balance
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#2cb64e] font-mono leading-tight truncate">
                    ${Number(user.balanceSC || 0).toFixed(2)} SC
                  </span>
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#2cb64e]/15 border border-[#2cb64e]/30 flex items-center justify-center text-[#2cb64e] shrink-0">
                  <Coins size={15} className="sm:w-4 sm:h-4" />
                </div>
              </div>

              {/* Green Wallet CTA */}
              <button
                type="button"
                onClick={() => {
                  onOpenCashier('deposit');
                  playTune('coin');
                }}
                className="btn-hood-green p-2.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs flex items-center gap-2 uppercase tracking-wider font-extrabold shadow-[0_4px_18px_rgba(44,182,78,0.4)]"
                title="Wallet"
              >
                <Wallet size={15} />
                <span className="hidden md:inline">Wallet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenNotifications?.();
                  playTune('bell', 0.55);
                }}
                className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#0c1b38] border border-[#1a3363] text-gray-300 hover:text-white hover:border-amber-500/50 transition-all shadow-sm"
                title="Notifications"
              >
                <Bell size={17} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#09142a]">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {/* Chat Support Button */}
              <button
                type="button"
                onClick={() => {
                  onOpenChat();
                  playTune('click');
                }}
                className="hidden sm:flex p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#0c1b38] border border-[#1a3363] text-gray-300 hover:text-white hover:border-[#2cb64e]/50 transition-all shadow-sm"
                title="Live Support Chat"
              >
                <MessageSquare size={17} />
              </button>

              {/* User Profile Dropdown */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-[#0c1b38] border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all shadow-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2cb64e] to-[#12244c] flex items-center justify-center text-xs font-black text-white">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-gray-200">
                    {user.username}
                  </span>
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#09142a] border border-[#1a3363] shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2.5 border-b border-[#1a3363]/60">
                      <p className="text-xs font-bold text-white truncate">{user.username}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/30">
                        {user.role}
                      </span>
                    </div>

                    {(user.role === 'admin' || user.role === 'staff' || user.role === 'superadmin') && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdown(false)}
                        className="block px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-[#0e2042] transition-colors"
                      >
                        ⚡ Staff Admin Desk
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdown(false);
                        onOpenCashier('withdraw');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-[#0e2042] hover:text-[#2cb64e] transition-colors"
                    >
                      Redeem / Cashout
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-[#1a3363]/60"
                    >
                      <LogOut size={13} />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Guest Action Buttons with proper margins and padding */}
              <button
                type="button"
                onClick={() => {
                  onOpenAuth('login');
                  playTune('click');
                }}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold text-gray-200 hover:text-white bg-[#0c1b38] border border-[#1a3363] hover:border-[#2cb64e]/40 transition-all shadow-sm"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenAuth('register');
                  playTune('click');
                }}
                className="btn-hood-green px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_18px_rgba(44,182,78,0.4)]"
              >
                <span className="whitespace-nowrap">Register</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
