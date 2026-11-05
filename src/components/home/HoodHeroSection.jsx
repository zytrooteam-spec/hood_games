'use client';

import React from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  Coins,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';

export default function HoodHeroSection({
  user,
  onOpenAuth,
  onOpenCashier,
  setActiveView,
  isMobileOnlyHome = false,
}) {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-[#1a3363] bg-[#09142a] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      {/* 1. Casino Hero Realistic Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/casino-hero-bg.jpg"
          alt="VIP Casino Lounge"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-center opacity-30 transform scale-105"
        />
        {/* Deep Blue Gradient Wash Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070d1e] via-[#09142a]/90 to-[#070d1e]/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070d1e] via-transparent to-transparent" />
      </div>

      {/* 2. Cyber Glowing Ambient Lights */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#2cb64e]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* 3. Hero Content Container */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & Explanations */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Official Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2cb64e]/20 border border-[#2cb64e]/50 text-[#2cb64e] text-xs font-black shadow-[0_0_20px_rgba(44,182,78,0.35)] backdrop-blur-md">
              <Sparkles size={14} className="text-emerald-400 animate-pulse" />
              <span>OFFICIAL SWEEPSTAKES PLATFORM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2cb64e]" />
              <span className="text-gray-200">USA 2026</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.15] tracking-tight">
                PLAY AMERICA’S #1 SWEEPS & WIN{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2cb64e] via-emerald-300 to-teal-200">
                  REAL CASH
                </span>
              </h1>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Welcome to <strong>Hood Games</strong> — the premier VIP hub for Orion Stars, Ultra Panda, Fire Kirin, Game Vault & Juwa. Instant Cash App & Zelle cashouts, 300% match bonus, and automatic 5%–20% Sunday cashback.
              </p>
            </div>

            {/* Core Feature Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs font-bold text-gray-200 bg-[#070d1e]/80 backdrop-blur-md p-3 rounded-2xl border border-[#1a3363] hover:border-[#2cb64e]/50 transition-colors shadow-md">
                <CheckCircle2 size={18} className="text-[#2cb64e] shrink-0" />
                <span>300% First Deposit Match</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-gray-200 bg-[#070d1e]/80 backdrop-blur-md p-3 rounded-2xl border border-[#1a3363] hover:border-[#2cb64e]/50 transition-colors shadow-md">
                <Clock size={18} className="text-[#2cb64e] shrink-0" />
                <span>15–30 Min Cashout Guarantee</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-gray-200 bg-[#070d1e]/80 backdrop-blur-md p-3 rounded-2xl border border-[#1a3363] hover:border-[#2cb64e]/50 transition-colors shadow-md">
                <Trophy size={18} className="text-[#2cb64e] shrink-0" />
                <span>Weekly Sunday Net Cashback</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-gray-200 bg-[#070d1e]/80 backdrop-blur-md p-3 rounded-2xl border border-[#1a3363] hover:border-[#2cb64e]/50 transition-colors shadow-md">
                <ShieldCheck size={18} className="text-[#2cb64e] shrink-0" />
                <span>100% Legal US Sweeps Model</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            {!isMobileOnlyHome && (
              <div className="hidden sm:flex items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (user) onOpenCashier('deposit');
                    else onOpenAuth('register');
                    playTune('click');
                  }}
                  className="btn-hood-green px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_22px_rgba(44,182,78,0.45)]"
                >
                  <span>{user ? 'Deposit with 300% Boost' : 'Claim $5.00 Free + 300% Bonus'}</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('games');
                    playTune('click');
                  }}
                  className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-200 bg-[#0c1b38]/90 hover:bg-[#12244c] border border-[#1a3363] hover:border-[#2cb64e]/50 transition-all shadow-md"
                >
                  Browse All 7+ Platforms
                </button>
              </div>
            )}
          </div>

          {/* Right Column: 3D Jackpot Showcase Card with generated graphic */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0e2042]/95 to-[#070d1e]/95 border-2 border-[#2cb64e]/40 p-6 text-center shadow-[0_15px_45px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              {/* Jackpot Header */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-3">
                <Flame size={12} className="text-amber-400" />
                <span>Live Community Jackpot</span>
              </div>

              {/* 3D Casino Art Frame */}
              <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-[#2cb64e]/50 shadow-[0_0_30px_rgba(44,182,78,0.4)] bg-[#070d1e] mb-4">
                <Image
                  src="/images/jackpot-banner.jpg"
                  alt="Lucky 777 Jackpot"
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              </div>

              {/* Running Ticker Amount */}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                  Grand Payout Pool
                </span>
                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-[#2cb64e] to-emerald-200 font-mono tracking-tight">
                  $777,480.00
                </span>
                <span className="text-[10px] text-gray-400 font-medium block">
                  Sweeps Coins (SC) • Paid in Cash
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="mt-5 p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363] grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">1 SC</span>
                  <span className="text-xs font-black text-[#2cb64e] font-mono">$1.00 USD</span>
                </div>
                <div className="border-x border-[#1a3363]">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Cashout</span>
                  <span className="text-xs font-black text-blue-300 font-mono">15 Mins</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Cashback</span>
                  <span className="text-xs font-black text-amber-300 font-mono">Sunday</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
