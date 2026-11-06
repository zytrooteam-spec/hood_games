'use client';

import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  Key,
  Sparkles,
  Gift,
  Coins,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

const ICON_MAP = {
  Wallet,
  ArrowUpRight,
  Key,
  Sparkles,
  Gift,
  Coins,
  ShieldCheck,
  Zap,
};

export default function HoodQuickActionCards({
  customCards = [],
  landingMode = false,
  onOpenCashier,
  onOpenSpinWheel,
  setActiveView,
}) {
  const defaultCards = [
    {
      id: 'card-1',
      title: 'Instant Deposit',
      subtitle: 'Cash App, Zelle & Crypto with 300% Boost',
      badge: '300% BONUS',
      tab: 'deposit',
      icon: 'Wallet',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      gradient: 'from-[#0a2318] via-[#09142a] to-[#060b17]',
      border: 'border-emerald-500/35 hover:border-emerald-400',
      glow: 'hover:shadow-[0_10px_35px_rgba(44,182,78,0.35)]',
    },
    {
      id: 'card-2',
      title: 'Redeem & Cashout',
      subtitle: 'Fast Payouts within 15-30 Minutes',
      badge: 'FAST CASHOUT',
      tab: 'withdraw',
      icon: 'ArrowUpRight',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
      gradient: 'from-[#0c2448] via-[#09142a] to-[#060b17]',
      border: 'border-blue-500/35 hover:border-blue-400',
      glow: 'hover:shadow-[0_10px_35px_rgba(59,130,246,0.35)]',
    },
    {
      id: 'card-3',
      title: 'Load Game Credits',
      subtitle: 'Orion, Kirin, Juwa & Milky Way',
      badge: 'INSTANT TRANSFER',
      tab: 'load',
      icon: 'Key',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      gradient: 'from-[#231038] via-[#09142a] to-[#060b17]',
      border: 'border-purple-500/35 hover:border-purple-400',
      glow: 'hover:shadow-[0_10px_35px_rgba(168,85,247,0.35)]',
    },
    {
      id: 'card-4',
      title: 'Sunday Cashback',
      subtitle: 'Weekly 5%-20% Net Payout Every Sunday',
      badge: 'AUTO REWARD',
      tab: 'cashback',
      icon: 'Sparkles',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      gradient: 'from-[#2e1d08] via-[#09142a] to-[#060b17]',
      border: 'border-amber-500/35 hover:border-amber-400',
      glow: 'hover:shadow-[0_10px_35px_rgba(245,158,11,0.35)]',
    },
    {
      id: 'card-5',
      title: 'Daily Free Spin',
      subtitle: 'Spin the Hood Wheel Daily for Free Cash',
      badge: 'FREE PLAY',
      tab: 'spin',
      icon: 'Gift',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
      gradient: 'from-[#072533] via-[#09142a] to-[#060b17]',
      border: 'border-cyan-500/35 hover:border-cyan-400',
      glow: 'hover:shadow-[0_10px_35px_rgba(6,182,212,0.35)]',
    },
  ];

  // Merge customized cards with defaults (ensuring 5 boxes)
  const cardsToRender =
    customCards && customCards.length > 0 ? customCards.slice(0, 5) : defaultCards;

  const handleCardClick = (card) => {
    playTune('click');
    if (landingMode) return;
    if (card.tab === 'deposit') {
      if (onOpenCashier) onOpenCashier('deposit');
    } else if (card.tab === 'withdraw') {
      if (onOpenCashier) onOpenCashier('withdraw');
    } else if (card.tab === 'load') {
      if (onOpenCashier) onOpenCashier('load');
    } else if (card.tab === 'cashback') {
      if (setActiveView) setActiveView('games');
      const el = document.getElementById('cashback-calculator-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (card.tab === 'spin') {
      if (onOpenSpinWheel) onOpenSpinWheel();
    } else if (onOpenCashier) {
      onOpenCashier('deposit');
    }
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 my-6 ${landingMode ? 'md:grid' : ''}`}
    >
      {cardsToRender.map((c, i) => {
        const IconComponent = ICON_MAP[c.icon] || Wallet;
        return (
          <div
            key={c.id || i}
            role={landingMode ? undefined : 'button'}
            tabIndex={landingMode ? undefined : 0}
            onClick={landingMode ? undefined : () => handleCardClick(c)}
            onKeyDown={
              landingMode
                ? undefined
                : (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(c);
                    }
                  }
            }
            className={`p-4 rounded-2xl bg-gradient-to-br ${
              c.gradient || 'from-[#0c1b38] via-[#09142a] to-[#070d1e]'
            } border ${
              c.border || 'border-[#1a3363] hover:border-[#2cb64e]'
            } ${
              c.glow || 'hover:shadow-[0_10px_30px_rgba(44,182,78,0.3)]'
            } transition-all duration-300 ${
              landingMode ? 'pointer-events-none select-none opacity-90 max-md:cursor-default' : 'cursor-pointer'
            } shadow-lg group flex flex-col justify-between min-h-[125px] relative overflow-hidden`}
          >
            {/* Top Row: Icon + Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform shadow-sm">
                <IconComponent className="w-5 h-5 text-[#2cb64e] stroke-[2.2]" />
              </div>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  c.badgeClass || 'bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40'
                }`}
              >
                {c.badge}
              </span>
            </div>

            {/* Bottom Row: Title + Subtitle */}
            <div className="mt-3 z-10">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white group-hover:text-[#2cb64e] transition-colors leading-snug">
                  {c.title}
                </h4>
                {!landingMode && (
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#2cb64e] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1" />
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-1 leading-snug line-clamp-2">
                {c.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
