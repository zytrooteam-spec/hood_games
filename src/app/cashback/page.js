'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAppShell } from '@/components/layout/AppShell';
import {
  Coins,
  Calculator,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Zap,
  CheckCircle2,
  DollarSign,
  Gift,
  AlertCircle
} from 'lucide-react';
import { playTune } from '@/lib/soundAlerts';
import Link from 'next/link';
import { diffSet } from '@/lib/fastDiff';

function CashbackPageContent() {
  const { user, fetchUser, openAuth } = useAppShell();

  // Calculator State
  const [calcDeposit, setCalcDeposit] = useState('500');
  const [calcCashout, setCalcCashout] = useState('100');
  const [cashbackPercent, setCashbackPercent] = useState(10);
  const [minDeposit, setMinDeposit] = useState(20);

  // User Stats & History
  const [userStats, setUserStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [claimError, setClaimError] = useState(null);

  // Time remaining to Sunday Midnight
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const loadCashbackSettings = () => {
    fetch('/api/cashback')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          if (d.cashbackPercent != null) diffSet(setCashbackPercent, Number(d.cashbackPercent));
          if (d.minDeposit != null) diffSet(setMinDeposit, Number(d.minDeposit));
          if (d.userStats) diffSet(setUserStats, d.userStats);
          if (Array.isArray(d.history)) diffSet(setHistory, d.history);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCashbackSettings();
    const interval = setInterval(loadCashbackSettings, 8000);
    return () => clearInterval(interval);
  }, [user]);

  // Sunday Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday
      const daysUntilSunday = (7 - currentDay) % 7;

      const target = new Date(now);
      target.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      target.setHours(23, 59, 59, 999);

      const diff = target - now;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Claim Cashback Handler
  const handleClaimCashback = async () => {
    if (!user) {
      openAuth('login');
      return;
    }

    setClaiming(true);
    setClaimSuccess(null);
    setClaimError(null);
    playTune('click');

    try {
      const res = await fetch('/api/cashback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      const data = await res.json();

      if (data?.success) {
        setClaimSuccess(data.message);
        playTune('win');

        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#2cb64e', '#3ae466', '#f59e0b', '#ffffff'],
        });

        // Refresh user balance and cashback stats
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user-sync', { detail: null }));
          window.dispatchEvent(new CustomEvent('hood-user-sync', { detail: null }));
        }
        if (fetchUser) fetchUser();
        loadCashbackSettings();
      } else {
        setClaimError(data?.error || 'Unable to claim cashback');
      }
    } catch {
      setClaimError('Network error connecting to cashier');
    } finally {
      setClaiming(false);
    }
  };

  // Compute calculated live values for scenario estimator
  const depVal = parseFloat(calcDeposit) || 0;
  const outVal = parseFloat(calcCashout) || 0;
  const netLoss = Math.max(0, depVal - outVal);
  const calculatedReward = (netLoss * (cashbackPercent / 100)).toFixed(2);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d234d] via-[#091733] to-[#070d1e] border-2 border-emerald-500/30 p-6 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#2cb64e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <Coins size={15} />
            <span>Weekly Sunday Net Loss Cashback</span>
            <span className="text-[#2cb64e] font-bold">• {cashbackPercent}% GUARANTEED</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Get Up to <span className="text-[#2cb64e]">{cashbackPercent}% Cashback</span> on Sundays
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            Every Sunday at midnight, receive between 5% to 20% of your weekly net losses
            credited directly back to your balance. 0x wagering requirement — 100% playable or redeemable immediately.
          </p>
        </div>
      </div>

      {/* Countdown & Weekly Player Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Next Sunday Countdown (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Calendar size={15} />
              <span>Next Sunday Cashback Drop:</span>
            </div>
            <h3 className="text-xl font-black text-white">Sunday 11:59 PM EST</h3>
            <p className="text-xs text-gray-400">
              Audits weekly deposits − cashouts and credits qualified player accounts.
            </p>
          </div>

          {/* Countdown Blocks */}
          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-2xl font-black text-white font-mono block">{timeLeft.days}</span>
              <span className="text-[9px] font-bold uppercase text-gray-400">Days</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-2xl font-black text-white font-mono block">{timeLeft.hours}</span>
              <span className="text-[9px] font-bold uppercase text-gray-400">Hours</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-2xl font-black text-white font-mono block">{timeLeft.minutes}</span>
              <span className="text-[9px] font-bold uppercase text-gray-400">Mins</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
              <span className="text-2xl font-black text-[#2cb64e] font-mono block">{timeLeft.seconds}</span>
              <span className="text-[9px] font-bold uppercase text-gray-400">Secs</span>
            </div>
          </div>
        </div>

        {/* Live Active Player Weekly Status & 1-Click Claim Action (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0e2042] via-[#09142a] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-2xl flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-[#1a3363] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2cb64e] animate-ping" />
              <h3 className="text-base font-black text-white">Your Live Weekly Cashback Status</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2cb64e]/20 text-[#2cb64e] border border-[#2cb64e]/40 text-xs font-mono font-bold">
              {cashbackPercent}% NET RETURN
            </span>
          </div>

          {user ? (
            <div className="space-y-4">
              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Weekly Deposits</span>
                  <span className="text-base font-black text-white font-mono">
                    ${Number(userStats?.totalDeposit || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Weekly Cashouts</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    ${Number(userStats?.totalCashout || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#070d1e] border border-[#1a3363]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Net Difference</span>
                  <span className="text-base font-black text-[#2cb64e] font-mono">
                    ${Number(userStats?.netDifference || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-[#070d1e]/80 border border-[#1a3363] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Pending Sunday Cashback</span>
                  <span className="text-3xl font-black text-[#2cb64e] font-mono">
                    ${Number(userStats?.estimatedCashback || 0).toFixed(2)} SC
                  </span>
                </div>

                {userStats?.isClaimed ? (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/60 border border-[#2cb64e] text-[#2cb64e] text-xs font-black uppercase">
                    <CheckCircle2 size={16} />
                    <span>Claimed For This Week</span>
                  </div>
                ) : userStats?.isEligible ? (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={handleClaimCashback}
                    className="btn-hood-green px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-[0_4px_25px_rgba(44,182,78,0.5)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Gift size={16} />
                    <span>{claiming ? 'Processing Payout...' : 'CLAIM SUNDAY CASHBACK NOW'}</span>
                  </button>
                ) : (
                  <div className="text-right sm:text-right text-xs text-gray-400">
                    <span className="block font-bold text-amber-300">Minimum $20 deposit required</span>
                    <span className="text-[10px]">Deposit to unlock your weekly cashback</span>
                  </div>
                )}
              </div>

              {/* Success / Error Messages */}
              {claimSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-[#2cb64e] text-xs text-[#2cb64e] font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{claimSuccess}</span>
                </div>
              )}
              {claimError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500 text-xs text-red-300 font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{claimError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-center space-y-3">
              <h4 className="text-sm font-black text-white">Log in to view and claim your Sunday Cashback</h4>
              <p className="text-xs text-gray-400">
                Sign in to audit your weekly deposit totals, net loss difference, and claim your rebate.
              </p>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="btn-hood-green px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Log In Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Estimator & Formula Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Calculator Box (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1a3363] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#2cb64e] uppercase">
                <Calculator size={15} />
                <span>What-If Scenario Estimator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Calculate Your Potential Sunday Cashback
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Current Rate</span>
              <span className="text-base font-black text-[#2cb64e] font-mono">{cashbackPercent}%</span>
            </div>
          </div>

          {/* Formula Display Banner */}
          <div className="p-4 rounded-2xl bg-[#070d1e] border border-[#1a3363] text-xs font-mono space-y-1">
            <span className="text-gray-400 block text-[10px] uppercase font-sans font-bold">Official Formula</span>
            <p className="text-white font-bold">
              Sunday Cashback = (Total Weekly Deposits − Total Weekly Cashouts) × {cashbackPercent}%
            </p>
          </div>

          {/* Interactive Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-300">Simulate Weekly Deposits ($):</span>
                <span className="text-[#2cb64e] font-mono">${depVal} SC</span>
              </div>
              <input
                type="number"
                min="0"
                step="25"
                value={calcDeposit}
                onChange={(e) => setCalcDeposit(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#070d1e] border-2 border-[#1a3363] text-white font-mono focus:border-[#2cb64e] focus:outline-none text-sm"
                placeholder="500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-300">Simulate Weekly Cashouts ($):</span>
                <span className="text-amber-400 font-mono">${outVal} SC</span>
              </div>
              <input
                type="number"
                min="0"
                step="25"
                value={calcCashout}
                onChange={(e) => setCalcCashout(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#070d1e] border-2 border-[#1a3363] text-white font-mono focus:border-[#2cb64e] focus:outline-none text-sm"
                placeholder="100"
              />
            </div>
          </div>

          {/* Output Display Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#12244c] to-[#070d1e] border-2 border-[#2cb64e]/50 shadow-inner space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-gray-300 tracking-wider">
                Simulated Sunday Cashback Payout:
              </span>
              <span className="text-[10px] font-bold text-[#2cb64e] uppercase bg-[#2cb64e]/15 px-2 py-0.5 rounded-full border border-[#2cb64e]/30">
                0x Wagering
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#2cb64e] font-mono">
                ${calculatedReward} SC
              </span>
              <span className="text-xs text-gray-400 font-bold">
                (on ${netLoss} Net Loss)
              </span>
            </div>
          </div>

          <Link
            href="/wallet"
            onClick={() => playTune('coin')}
            className="w-full btn-hood-green py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(44,182,78,0.35)]"
          >
            <Zap size={16} />
            <span>Deposit to Boost Your Weekly Play</span>
          </Link>
        </div>

        {/* Right: Claim History Table & Rules (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Claim History Table */}
          <div className="p-6 rounded-3xl bg-[#09142a] border-2 border-[#1a3363] space-y-4 shadow-xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock size={18} className="text-[#2cb64e]" />
              <span>Past Claim History</span>
            </h3>

            {history.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#070d1e] text-center text-gray-400 text-xs">
                No previous cashback claims recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((c, idx) => (
                  <div
                    key={c._id || idx}
                    className="p-3 rounded-xl bg-[#070d1e] border border-[#1a3363] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">
                        Week of {c.weekKey || new Date(c.claimedAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Deposited: ${Number(c.totalDeposit || 0).toFixed(0)} • Out: ${Number(c.totalCashout || 0).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-[#2cb64e] text-sm block">
                        +${Number(c.cashbackAmount || 0).toFixed(2)} SC
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {c.percentage || cashbackPercent}% Rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highlights */}
          <div className="p-6 rounded-3xl bg-[#070d1e] border-2 border-[#1a3363] space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2cb64e]" />
              <span>Sunday Cashback Rules</span>
            </h4>
            <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Admin-Adjusted Rate:</strong> Configured between 5% and 20% in the Admin Desk.</li>
              <li><strong className="text-white">Zero Playthrough (0x):</strong> Play any arcade slot or cash out immediately.</li>
              <li><strong className="text-white">Direct Wallet Credit:</strong> Automatically claimed or disbursed directly to your SC balance.</li>
            </ul>

            <div className="pt-2">
              <Link
                href="/vip"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                <span>Higher VIP Tiers get up to 20% Cashback 👑</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashbackPage() {
  return <CashbackPageContent />;
}
