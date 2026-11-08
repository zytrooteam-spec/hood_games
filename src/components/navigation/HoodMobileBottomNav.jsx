'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Gamepad2, Wallet, Download, MessageSquare } from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HoodMobileBottomNav({
  onOpenCashier,
  onOpenApp,
  onOpenChat,
  sidebarOpen = false,
}) {
  const pathname = usePathname();

  if (sidebarOpen) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09142a]/95 backdrop-blur-2xl border-t border-[#1a3363] px-3 py-1 shadow-[0_-10px_35px_rgba(0,0,0,0.8)]"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center relative">
        {/* 1. Home */}
        <Link
          href="/"
          onClick={() => playTune('click')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            pathname === '/'
              ? 'text-[#2cb64e] scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Home size={20} className={pathname === '/' ? 'stroke-[2.5]' : ''} />
            {pathname === '/' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2cb64e]" />
            )}
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tight">Home</span>
        </Link>

        {/* 2. Games */}
        <Link
          href="/games"
          onClick={() => playTune('click')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            pathname === '/games'
              ? 'text-[#2cb64e] scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <Gamepad2 size={21} className={pathname === '/games' ? 'stroke-[2.5]' : ''} />
            {pathname === '/games' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2cb64e]" />
            )}
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tight">Games</span>
        </Link>

        {/* 3. Wallet (CENTER Prominent Raised Glowing Green Button) */}
        <div className="flex justify-center items-center -mt-6">
          <Link
            href="/wallet"
            onClick={() => playTune('coin')}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr from-[#167831] via-[#2cb64e] to-[#3ae466] border-2 border-white/50 shadow-[0_6px_25px_rgba(44,182,78,0.65)] flex flex-col items-center justify-center text-white active:scale-90 transition-transform group ${
              pathname === '/wallet' ? 'ring-4 ring-[#2cb64e]/40' : ''
            }`}
            title="Open Wallet"
          >
            <Wallet size={20} className="stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span className="text-[8.5px] font-black uppercase tracking-wider mt-0.5">Wallet</span>
          </Link>
        </div>

        {/* 4. App (Download Hood Games APK) */}
        <Link
          href="/download-app"
          onClick={() => playTune('click')}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            pathname === '/download-app'
              ? 'text-[#2cb64e] scale-105'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Download size={20} className={pathname === '/download-app' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] font-black mt-1 tracking-tight">App</span>
        </Link>

        {/* 5. Chat Support */}
        <Link
          href="/chat"
          onClick={() => playTune('click')}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 relative ${
            pathname === '/chat' ? 'text-[#2cb64e] scale-105' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <MessageSquare size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2cb64e] animate-pulse" />
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tight">Support</span>
        </Link>
      </div>
    </div>
  );
}
