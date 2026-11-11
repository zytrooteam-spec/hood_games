'use client';

import React, { useState, useEffect } from 'react';
import { useAppShell } from '@/components/layout/AppShell';
import { getDefaultVipConfig, resolveVipConfig } from '@/lib/vipConfig';
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

const BENEFIT_ICONS = { Coins, Zap, Headphones };

function VipPageContent() {
  const { user, openAuth } = useAppShell();
  const [vipCfg, setVipCfg] = useState(getDefaultVipConfig());

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setVipCfg(resolveVipConfig(d.settings));
      })
      .catch(() => {});
  }, []);

  const tiers = vipCfg.tiers || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
            <Crown size={15} className="text-amber-400" />
            <span>{vipCfg.heroEyebrow}</span>
            <span className="text-base">👑</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            {vipCfg.heroTitleHtml}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{vipCfg.heroDescription}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/wallet"
              onClick={() => playTune('coin')}
              className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_20px_rgba(44,182,78,0.4)] flex items-center gap-2"
            >
              <Zap size={16} />
              <span>{vipCfg.heroCtaLabel || 'Deposit & Boost VIP Rank'}</span>
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
                <span className="text-amber-400 font-bold">{vipCfg.statusCashbackRange || '10% - 20% Net'}</span>
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
            <h2 className="text-xl font-black text-white">{vipCfg.tiersHeading || 'VIP Loyalty Tiers'}</h2>
            <p className="text-xs text-gray-400">{vipCfg.tiersSubheading}</p>
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
            <span>{vipCfg.benefitsEyebrow}</span>
          </div>
          <h2 className="text-2xl font-black text-white">{vipCfg.benefitsHeading}</h2>
          <p className="text-xs text-gray-300">{vipCfg.benefitsSubheading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(vipCfg.benefitCards || []).map((card, i) => {
            const Icon = BENEFIT_ICONS[card.icon] || Coins;
            return (
              <div key={i} className="p-5 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#2cb64e]/20 border border-[#2cb64e]/40 flex items-center justify-center text-[#2cb64e]">
                  <Icon size={20} />
                </div>
                <h4 className="text-sm font-black text-white">{card.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{card.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function VipPage() {
  return <VipPageContent />;
}
