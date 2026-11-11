'use client';

import React, { useState } from 'react';
import { useAppShell } from '@/components/layout/AppShell';
import {
  Users,
  Copy,
  Check,
  Share2,
  DollarSign,
  Gift,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  QrCode,
  MessageCircle,
  Send
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import Link from 'next/link';

function ReferralPageContent() {
  const { user, openAuth } = useAppShell();
  const [copied, setCopied] = useState(false);

  const refCode = user?.username ? user.username.toUpperCase() : 'VIPHOOD';
  const refLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${refCode}`
    : `https://hoodgames.vip/?ref=${refCode}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    playTune('click');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const text = `Join me on Hood Games! Use my link for an instant 100% deposit match + daily free wheel spin: ${refLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const text = `Play Orion Stars, Fire Kirin & Ultra Panda on Hood Games: ${refLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-purple-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider">
            <Users size={15} />
            <span>Hood Games Affiliate & Referral Program</span>
            <span className="text-emerald-400 font-bold">• 20% COMMISSION</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Refer Friends & Earn <span className="text-[#2cb64e]">20% Commission</span> on Every Deposit
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Invite players to Hood Games. When your referred friends join and fund their accounts,
            you earn up to 20% instant credit directly into your playable and redeemable balance.
            Zero earnings caps, unlimited friends.
          </p>
        </div>
      </div>

      {/* Referral Link & Stats Box */}
      {user ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Link Generator Box */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-5 shadow-xl">
            <div>
              <span className="text-xs uppercase font-extrabold text-[#2cb64e] tracking-wider block">
                Your Exclusive Referral Link
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Share & Start Earning Automatically
              </h2>
            </div>

            {/* Link Input Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-2xl bg-[#070d1e] border-2 border-[#1a3363] text-gray-200 font-mono text-xs sm:text-sm truncate select-all">
                {refLink}
              </div>

              <button
                type="button"
                onClick={copyRefLink}
                className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Referral Code Badge */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Your Unique Referral Code:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#12244c] border border-[#254687] text-white font-mono font-bold tracking-wider">
                {refCode}
              </span>
            </div>

            {/* Social Sharing CTAs */}
            <div className="pt-3 border-t border-[#1a3363] flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-400 font-bold">Quick Share:</span>
              <button
                type="button"
                onClick={shareViaWhatsApp}
                className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={shareViaTelegram}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Send size={15} />
                <span>Telegram</span>
              </button>
            </div>
          </div>

          {/* User Live Referral Metrics */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1b38] to-[#070d1e] border-2 border-[#1a3363] flex flex-col justify-between space-y-4 shadow-xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#2cb64e]" />
              <span>Your Referral Dashboard</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#09142a] border border-[#1a3363] flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Referred</span>
                <span className="text-lg font-black text-white font-mono">0 Players</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09142a] border border-[#1a3363] flex items-center justify-between">
                <span className="text-xs text-gray-400">Commission Rate</span>
                <span className="text-lg font-black text-[#2cb64e] font-mono">20% Net</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09142a] border border-[#1a3363] flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Paid Out</span>
                <span className="text-lg font-black text-amber-400 font-mono">$0.00 SC</span>
              </div>
            </div>

            <Link
              href="/wallet"
              className="w-full text-center py-2.5 rounded-xl btn-hood-green text-xs font-black uppercase tracking-wider shadow-md"
            >
              Deposit / Redeem
            </Link>
          </div>
        </div>
      ) : (
        /* Guest Callout to Login */
        <div className="p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] text-center max-w-xl mx-auto space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto">
            <Users size={26} />
          </div>
          <h2 className="text-2xl font-black text-white">Log In to Grab Your Referral Code</h2>
          <p className="text-xs text-gray-300">
            Sign up or sign in to generate your customized referral link, track your players,
            and collect your 20% commission on every transaction.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-[#12244c] text-white border border-[#254687]"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* 3 Step Workflow */}
      <div className="p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-6 shadow-2xl">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-black text-white">How Referral Commissions Work</h2>
          <p className="text-xs text-gray-400">
            Three simple steps to generate passive sweeps credits every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-3 relative">
            <span className="text-4xl font-black text-[#2cb64e]/30 font-mono">01</span>
            <h4 className="text-base font-black text-white">Send Your Link</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Share your link or code with your gaming circle, social media, or stream audience.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-3 relative">
            <span className="text-4xl font-black text-[#2cb64e]/30 font-mono">02</span>
            <h4 className="text-base font-black text-white">Friend Registers & Loads</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              When they create an account and deposit $20 or more via Cash App, Chime, or Crypto.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#070d1e] border border-[#1a3363] space-y-3 relative">
            <span className="text-4xl font-black text-[#2cb64e]/30 font-mono">03</span>
            <h4 className="text-base font-black text-white">Instant 20% Cash Credit</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your 20% reward lands straight into your wallet immediately, ready to play or redeem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReferralPage() {
  return <ReferralPageContent />;
}
