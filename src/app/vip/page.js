'use client';

import React, { useState } from 'react';
import AppShell, { useAppShell } from '@/components/layout/AppShell';
import {
  Crown,
  ShieldCheck,
  Zap,
  Gift,
  Coins,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Headphones,
  Award
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import Link from 'next/link';

function VipPageContent() {
  const { user, openAuth } = useAppShell();
  const [selectedTier, setSelectedTier] = useState('gold');

  const tiers = [
    {
      id: 'bronze',
      name: 'Bronze Club',
      badge: 'TIER 1',
      color: 'from-amber-700/30 to-amber-900/10 border-amber-600/40 text-amber-400',
      tagColor: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
      turnover: '$0 - $499',
      cashback: '5%',
      spinMultiplier: '1x Daily',
      withdrawalSpeed: 'Standard (1-2 hrs)',
      features: [
        '5% Sunday Net Loss Cashback',
        'Daily Free Wheel Spin (1x)',
        'Standard Telegram / Chat Support',
        'Official Sweepstakes Verification',
      ],
    },
    {
      id: 'silver',
      name: 'Silver Elite',
      badge: 'TIER 2',
      color: 'from-slate-400/25 to-slate-700/10 border-slate-400/40 text-slate-200',
      tagColor: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
      turnover: '$500 - $1,999',
      cashback: '8%',
      spinMultiplier: '2x Daily',
      withdrawalSpeed: 'Priority (< 45 mins)',
      features: [
        '8% Sunday Net Loss Cashback',
        'Daily Free Wheel Spin (2x)',
        'Fast-track Cashout Queue',
        'Monthly Level-Up Bonus ($25 SC)',
        'Priority Live Support',
      ],
    },
    {
      id: 'gold',
      name: 'Gold Master',
      badge: 'POPULAR VIP',
      color: 'from-yellow-500/25 to-amber-700/15 border-yellow-500/50 text-yellow-300 ring-2 ring-yellow-500/30',
      tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      turnover: '$2,000 - $4,999',
      cashback: '12%',
      spinMultiplier: '3x Daily',
      withdrawalSpeed: 'Express (< 15 mins)',
      popular: true,
      features: [
        '12% Sunday Net Loss Cashback',
        'Daily Free Wheel Spin (3x)',
        'Express Cashout Processing (< 15 mins)',
        'Dedicated VIP Account Representative',
        '$100 Birthday Bonus & Custom Reloads',
        'Exclusive High-RTP Game Rooms',
      ],
    },
    {
      id: 'platinum',
      name: 'Platinum High-Roller',
      badge: 'HIGH STAKES',
      color: 'from-cyan-500/25 to-blue-700/15 border-cyan-400/50 text-cyan-300',
      tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      turnover: '$5,000 - $14,999',
      cashback: '15%',
      spinMultiplier: 'Unlimited Free Spins',
      withdrawalSpeed: 'Instant (< 5 mins)',
      features: [
        '15% Sunday Net Loss Cashback',
        'Instant Automated Redemptions',
        'Zero Withdrawal Caps & Fees',
        'Personal VIP Concierge Desk (WhatsApp/Call)',
        '$300 Level-Up Reward + Luxury Swag Pack',
        'Customized Reload Match Deals',
      ],
    },
    {
      id: 'diamond',
      name: 'Diamond Royale',
      badge: 'ELITE PRESTIGE',
      color: 'from-purple-500/25 to-pink-700/15 border-purple-400/50 text-purple-300',
      tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      turnover: '$15,000 - $49,999',
      cashback: '18%',
      spinMultiplier: 'Mega Wheel Access',
      withdrawalSpeed: 'Instant Under 3 Mins',
      features: [
        '18% Sunday Net Loss Cashback',
        'Mega Jackpot Wheel Access ($500+ Prizes)',
        'Instant Priority Wire & Crypto Settlement',
        '24/7 Dedicated Senior Concierge Host',
        '$1,000 Seasonal Cash Credits',
        'Private High-Limit Sweeps Servers',
      ],
    },
    {
      id: 'black',
      name: 'Black Crown',
      badge: 'BY INVITATION',
      color: 'from-emerald-500/20 via-[#0a1f3d] to-black/80 border-[#2cb64e]/60 text-[#2cb64e]',
      tagColor: 'bg-[#2cb64e]/20 text-[#2cb64e] border-[#2cb64e]/40',
      turnover: '$50,000+',
      cashback: '20% MAXIMUM',
      spinMultiplier: 'Guaranteed Jackpots',
      withdrawalSpeed: 'Direct VIP Wire',
      features: [
        '20% MAXIMUM Net Loss Sunday Cashback',
        'Uncapped Redemptions Anytime',
        'Direct Private WhatsApp with Casino GM',
        'All-Expenses-Paid Vegas Hospitality Trips',
        'Custom Tailored Rebate & Crypto Rates',
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Crown size={15} className="text-amber-400" />
            <span>Hood Games VIP Club • Privilege Lounge</span>
            <span className="text-base">👑</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Elevate to <span className="text-amber-400">VIP Royalty</span> & Earn Up to{' '}
            <span className="text-[#2cb64e]">20% Cashback</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Welcome to the highest-paying VIP lounge in online sweeps. Enjoy instant payouts,
            custom high-roller tables, a personal concierge desk, and weekly Sunday cashbacks
            credited directly to your wallet without wagering hurdles.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/wallet"
              onClick={() => playTune('coin')}
              className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_20px_rgba(44,182,78,0.4)] flex items-center gap-2"
            >
              <Zap size={16} />
              <span>Deposit & Boost VIP Rank</span>
            </Link>

            {!user && (
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-[#12244c] hover:bg-[#1a3363] text-white border border-[#254687] transition-all"
              >
                Join VIP Program
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIP Status Card if User Logged In */}
      {user && (
        <div className="p-6 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 text-2xl shadow-lg">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{user.username}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 uppercase">
                  Active VIP Tier
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Current Balance:{' '}
                <span className="text-[#2cb64e] font-mono font-bold">
                  ${Number(user.balanceSC || 0).toFixed(2)} SC
                </span>{' '}
                • Sunday Cashback Rate:{' '}
                <span className="text-amber-400 font-bold">10% - 20% Net</span>
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-3">
            <Link
              href="/cashback"
              className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl bg-[#0c1b38] hover:bg-[#12244c] text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider transition-all"
            >
              View My Cashback
            </Link>
            <Link
              href="/wallet"
              className="flex-1 md:flex-none text-center btn-hood-green px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
            >
              Deposit Funds
            </Link>
          </div>
        </div>
      )}

      {/* Tier Selector Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">VIP Loyalty Tiers</h2>
            <p className="text-xs text-gray-400">
              Wager on Orion Stars, Fire Kirin, or Ultra Panda to automatically level up.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiers.map((tier) => {
            const isCurrent = tier.popular;
            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl bg-[#09142a] border-2 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-xl ${
                  tier.color
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black tracking-widest uppercase shadow-md flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Tier Title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${tier.tagColor}`}>
                        {tier.badge}
                      </span>
                      <h3 className="text-xl font-black text-white mt-2 flex items-center gap-1.5">
                        {tier.name}
                        {tier.id === 'black' && <Crown size={18} className="text-amber-400 fill-amber-400" />}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Weekly Turnover</span>
                      <span className="text-xs font-mono font-bold text-white">{tier.turnover}</span>
                    </div>
                  </div>

                  {/* High Value Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#070d1e]/80 border border-[#1a3363]">
                    <div>
                      <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Sunday Cashback</span>
                      <span className="text-base font-black text-[#2cb64e] font-mono">{tier.cashback}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Cashout Speed</span>
                      <span className="text-xs font-bold text-amber-300">{tier.withdrawalSpeed}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2 pt-2 border-t border-[#1a3363]/80">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle2 size={14} className="text-[#2cb64e] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier Action */}
                <div className="pt-6 mt-4 border-t border-[#1a3363]/60">
                  <Link
                    href="/wallet"
                    onClick={() => playTune('click')}
                    className="w-full py-2.5 rounded-xl btn-hood-green text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Claim Tier Perks</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VIP Hall of Fame / Benefits Grid */}
      <div className="p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-6 shadow-2xl">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black uppercase">
            <Award size={13} />
            <span>Guaranteed White-Glove Treatment</span>
          </div>
          <h2 className="text-2xl font-black text-white">Why Play VIP at Hood Games?</h2>
          <p className="text-xs text-gray-300">
            We value high-volume players more than anyone else in the industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
              <Coins size={20} />
            </div>
            <h4 className="text-sm font-black text-white">Guaranteed Sunday Net Cashback</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Calculated automatically as (Deposits - Cashouts) × Percentage. Disbursed every Sunday at midnight.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Zap size={20} />
            </div>
            <h4 className="text-sm font-black text-white">Lightning Cashout Priority</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your redemptions skip the regular queue. Receive your Cash App, Chime, Venmo, or Crypto in minutes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Headphones size={20} />
            </div>
            <h4 className="text-sm font-black text-white">24/7 Dedicated Concierge</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              No bots, no waiting. Speak directly with senior floor managers anytime via live chat or private channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VipPage() {
  return (
    <AppShell>
      <VipPageContent />
    </AppShell>
  );
}
